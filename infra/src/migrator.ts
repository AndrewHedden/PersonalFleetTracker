/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * One-shot Drizzle migrator Lambda — currently DISABLED.
 *
 * Why disabled (2026-05-26): every combination we tried —
 *   - `vpc: vpc` (so the Lambda can reach RDS on its private endpoint)
 *   - `environment: { ...references to db.host / db.password / etc. }`
 *   - `copyFiles: [{ from: 'packages/db/drizzle', to: 'drizzle' }]`
 * — triggers the same `RangeError: Invalid string length` in Pulumi's
 * error formatter during deploy, even with `link: [db]` removed. The
 * Migrator's Lambda function is never actually created — only the S3
 * code/sourcemap uploads make it through before the deploy aborts.
 *
 * Workaround for now: migrations run from local against an RDS instance
 * that's briefly made publicly-accessible with a one-IP security-group
 * rule. See README "Working with migrations" for the runbook.
 *
 * The handler implementation in `packages/api/src/handlers/migrate.ts`
 * is correct and ready to use the day this is unblocked — either by an
 * SST upgrade that fixes the crash or by a different network topology
 * (RDS Proxy with a public-ish endpoint + IAM auth, perhaps).
 *
 * Re-enable by importing this module from `sst.config.ts > run()` and
 * adding `migratorName: migrator.name` back to its return value.
 */
import type {} from './storage';

export {};

// export const migrator = new sst.aws.Function('Migrator', {
//   handler: 'packages/api/src/handlers/migrate.handler',
//   vpc,
//   timeout: '5 minutes',
//   memory: '512 MB',
//   runtime: 'nodejs22.x',
//   environment: {
//     DB_HOST: db.host,
//     DB_PORT: db.port.apply((p) => String(p)),
//     DB_NAME: db.database,
//     DB_USER: db.username,
//     DB_PASSWORD: db.password,
//   },
//   copyFiles: [{ from: 'packages/db/drizzle', to: 'drizzle' }],
// });
