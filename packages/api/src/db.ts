import * as schema from '@stablebook/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { Resource } from 'sst';

/**
 * Lambda-friendly Drizzle factory.
 *
 * The pg Pool is cached at module scope so warm Lambda invocations reuse a
 * single TCP connection to RDS. `max: 1` keeps each Lambda instance to one
 * connection (RDS connection limits scale with instance size; for t4g.micro
 * we have ~85 max — plenty for now, but we want predictability).
 *
 * Credentials come from `Resource.Db.*` which SST wires in as env vars at
 * deploy time when the function is `link`ed to the Postgres component.
 *
 * `ssl: { rejectUnauthorized: false }` because RDS uses an AWS-signed cert
 * whose root CA isn't in the default Node trust store on AL2023. The Lambda
 * runs inside the same VPC as RDS so the connection never leaves AWS.
 */

let _pool: pg.Pool | undefined;

export function getDb() {
  if (!_pool) {
    _pool = new pg.Pool({
      host: Resource.Db.host,
      port: Resource.Db.port,
      database: Resource.Db.database,
      user: Resource.Db.username,
      password: Resource.Db.password,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return drizzle(_pool, { schema });
}

export type Db = ReturnType<typeof getDb>;
