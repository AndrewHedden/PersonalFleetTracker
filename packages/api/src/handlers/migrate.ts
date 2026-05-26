import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/**
 * One-shot Drizzle migrator Lambda.
 *
 * Wired into the VPC alongside RDS so it can reach the DB on its private
 * endpoint. Credentials come from env vars set by `infra/src/migrator.ts`
 * (we deliberately don't use SST's `link: [db]` here — that triggers a
 * RangeError in Pulumi/Node during deploy; see project memory).
 *
 * Migration SQL is bundled from `packages/db/drizzle/` via SST's
 * `copyFiles`, which lands the directory at `/var/task/drizzle/` inside
 * the Lambda — the path is then `./drizzle` relative to the handler.
 *
 * Invoke from local:
 *   aws lambda invoke --function-name <name> --profile pft /tmp/out.json
 */

interface MigrateResult {
  status: 'ok' | 'error';
  appliedAt: string;
  tables: string[];
  error?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export const handler = async (): Promise<MigrateResult> => {
  const host = requireEnv('DB_HOST');
  const port = Number(requireEnv('DB_PORT'));
  const database = requireEnv('DB_NAME');
  const user = requireEnv('DB_USER');
  const password = requireEnv('DB_PASSWORD');

  const pool = new pg.Pool({
    host,
    port,
    database,
    user,
    password,
    // RDS in transit. We use TLS but don't verify the chain — RDS root CAs
    // aren't trusted out of the box on the AL2023 Lambda runtime, and the
    // migrator only runs from inside our own VPC.
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });

  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './drizzle' });

    const tablesResult = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
    );

    return {
      status: 'ok',
      appliedAt: new Date().toISOString(),
      tables: tablesResult.rows.map((r) => r.table_name),
    };
  } catch (err) {
    return {
      status: 'error',
      appliedAt: new Date().toISOString(),
      tables: [],
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await pool.end();
  }
};
