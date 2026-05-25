# @pft/db

Drizzle ORM schema, queries, and migrations for PersonalFleetTracker.

## Layout

```
src/
├── schema/
│   ├── users.ts
│   ├── vehicles.ts
│   ├── fuel-entries.ts
│   ├── maintenance-tasks.ts
│   ├── maintenance-entries.ts
│   ├── maintenance-entry-tasks.ts
│   ├── maintenance-schedules.ts
│   └── index.ts
├── client.ts            # `createDbClient({ connectionString, ssl, max })`
└── index.ts             # public package entry
drizzle/                 # generated migration SQL (committed)
drizzle.config.ts
```

## Tables

| Table                       | Purpose                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `users`                     | App user record, keyed to a Cognito `sub`                          |
| `vehicles`                  | One row per car the user tracks                                    |
| `fuel_entries`              | Fill-ups: odometer, gallons, total, $/gal, tank-filled flag        |
| `maintenance_tasks`         | Catalog of task types — system (`user_id IS NULL`) + per-user      |
| `maintenance_entries`       | A service event on a vehicle (odo, date, total cost, shop, notes)  |
| `maintenance_entry_tasks`   | Join: many tasks per entry (oil change + tire rotation together)   |
| `maintenance_schedules`     | Per-vehicle/task interval (`interval_miles` and/or `interval_months`) — reminders are derived |

## Reminders are derived

There is no `reminders` table. For each `maintenance_schedules` row we look up the most recent `maintenance_entries` joined to `maintenance_entry_tasks` for the same `vehicle_id` + `task_id`, and check whether either the mileage delta or the elapsed time has reached the interval.

## Scripts

```bash
# Generate migration SQL from the TS schema
pnpm --filter @pft/db db:generate

# Apply migrations to whichever DB DATABASE_URL points to
pnpm --filter @pft/db db:migrate

# Open Drizzle Studio (web UI to inspect data)
pnpm --filter @pft/db db:studio

# Verify migration history is consistent
pnpm --filter @pft/db db:check
```

## Local dev

Set `DATABASE_URL` in your shell or in a `.env` file at the repo root, e.g.:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pft_dev
```

For deploys, `DATABASE_URL` will be assembled from RDS + Secrets Manager by the SST stack in Phase 2.
