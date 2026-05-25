import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema/index.js';

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

export interface CreateClientOptions {
  connectionString: string;
  /** Number of connections in the pool. Lambdas should use 1. */
  max?: number;
  /** Idle timeout in ms before a client is released from the pool. */
  idleTimeoutMillis?: number;
  /** Whether to enable SSL. RDS requires it; local dev usually doesn't. */
  ssl?: boolean;
}

export function createDbClient(options: CreateClientOptions): { db: DbClient; pool: pg.Pool } {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(pool, { schema });
  return { db, pool };
}
