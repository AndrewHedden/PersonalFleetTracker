# PersonalFleetTracker

A personal fleet tracker: log fuel and maintenance for the vehicles you own, get reminders before routine maintenance comes due. Web app + native iOS companion, deployed on AWS.

> Status: **Phase 3a** — Next.js 16 scaffold integrated into the workspace. Nothing deployed to AWS yet.

## Features (planned)

- Manage multiple automobiles
- Log fuel fills (odometer, gallons, total cost, $/gal, tank-filled flag, date)
- Log maintenance completed (odometer, task(s), date, total cost)
- Define routine maintenance schedules with **both** mileage-based and time-based intervals, and get reminders when something is due
- Single user today; multi-user-ready under Cognito auth from day one

## Stack

| Layer       | Choice                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| Web         | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui                       |
| iOS         | Native SwiftUI + AWS Amplify Swift SDK                                            |
| API         | API Gateway HTTP API + AWS Lambda (TypeScript)                                    |
| Database    | Amazon RDS Postgres `t4g.micro` single-AZ + Drizzle ORM                           |
| Auth        | Amazon Cognito User Pools (JWT for both clients)                                  |
| Infra       | [SST v3](https://sst.dev) (TypeScript, built on AWS CDK)                          |
| Hosting     | Next.js SSR on Lambda + CloudFront via SST                                        |
| CI/CD       | GitHub Actions                                                                    |
| Node / pkg  | Node 22 LTS via [mise](https://mise.jdx.dev) · [pnpm](https://pnpm.io) workspaces |

Designed to stay inside the AWS Free Tier wherever possible.

## Repository layout

```
.
├── web/                # Next.js app (Phase 3)
├── ios/                # Xcode project (Phase 4)
├── infra/              # SST app (Phase 2)
├── packages/
│   ├── db/             # Drizzle schema, queries, migrations
│   ├── shared/         # Shared TS types / Zod schemas / API contract
│   └── api/            # Lambda handlers
├── .github/workflows/  # CI
└── package.json        # pnpm workspace root
```

## Prerequisites

- **macOS** (iOS work requires Xcode)
- [**mise**](https://mise.jdx.dev) — `brew install mise`, then add `eval "$(mise activate zsh)"` to `~/.zshrc`
- **Node 22 LTS** and **pnpm** — installed via mise (see below)
- **Xcode 16+** for iOS development (Phase 4 onwards)
- An **AWS account** for deploys (Phase 2 onwards) — free tier eligible

## Getting started

```bash
git clone <this repo>
cd PersonalFleetTracker

# Install Node 22 (mise reads .mise.toml)
mise install
corepack enable
corepack prepare pnpm@latest --activate

# Install workspace dependencies
pnpm install
```

### Common scripts

```bash
pnpm lint          # lint every workspace that defines a `lint` script
pnpm typecheck     # tsc --noEmit across workspaces
pnpm test          # vitest / etc.
pnpm format        # prettier --write .
pnpm format:check  # prettier --check . (used by CI)
pnpm dev           # parallel dev servers (filled in once web/api exist)
```

## Infrastructure

SST v3 defines all infra in TypeScript at the project root (`sst.config.ts`), with
per-concern stack files in [`infra/src/`](infra/src/):

| File                              | What lives here                                            |
| --------------------------------- | ---------------------------------------------------------- |
| [`infra/src/storage.ts`](infra/src/storage.ts) | VPC (no NAT) + RDS Postgres `t4g.micro` single-AZ |
| [`infra/src/auth.ts`](infra/src/auth.ts)       | Cognito user pool + app client                    |
| [`infra/src/api.ts`](infra/src/api.ts)         | API Gateway HTTP API + JWT authorizer + Lambdas   |
| [`infra/src/web.ts`](infra/src/web.ts)         | Next.js site (SSR on Lambda + CloudFront)         |

### Cost posture

The stack is engineered to stay inside the AWS Free Tier for the first 12 months:

- **No NAT Gateway** (~$32/mo avoided). Lambdas live in the same VPC as RDS and don't call out to the public internet. Cognito JWT verification happens at API Gateway, so Lambda handlers receive pre-verified claims and never hit Cognito JWKS over the network.
- **RDS `db.t4g.micro` single-AZ** with 20 GB gp2 storage — exactly what the 12-month free tier covers.
- **API Gateway HTTP API**, not REST API — cheaper after free tier expires and free for the first 12 months.
- **Cognito** is free up to 50k MAU forever.
- **CloudFront** stays inside the "always free" tier (1 TB out + 10M req/mo).
- **`sst remove` is enabled for non-`production` stages**, so personal dev stacks can be torn down to zero ongoing cost.

If you ever need Lambda → outbound internet (e.g. a third-party API call), prefer adding the specific VPC interface endpoint (~$7/mo) over a NAT Gateway (~$32/mo).

### Running migrations

A Migrator Lambda lives inside the VPC alongside RDS. Invoke it from local to apply any pending Drizzle migrations (idempotent — Drizzle tracks state in `__drizzle_migrations`):

```bash
pnpm invoke:migrate                # against the default `andrew` stage
pnpm invoke:migrate production     # against another stage
```

Response is a JSON object with `status`, `appliedAt`, and the resulting list of public-schema tables. The script is at [`scripts/invoke-migrate.sh`](scripts/invoke-migrate.sh).

### Working with the stack

```bash
# (One-time) Download SST platform code
pnpm --filter @pft/infra exec sst install

# See what would change without applying
pnpm --filter @pft/infra sst:diff

# Local dev with `sst dev` (live Lambda + tunnel)
pnpm --filter @pft/infra sst:dev

# Deploy a stage (defaults to your username)
pnpm --filter @pft/infra sst:deploy --stage andrew

# Tear a stage down
pnpm --filter @pft/infra sst:remove --stage andrew
```

## Roadmap

| Phase | Scope                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| **0** | ✅ Repo skeleton, pnpm workspaces, lint/format/typecheck/CI scaffolding, Node pinning                            |
| **1** | ✅ Drizzle schema (`users`, `vehicles`, `fuel_entries`, 4 × `maintenance_*`), initial migration, seeded task catalog |
| **2** | ✅ SST v3 stacks: VPC (no NAT), RDS Postgres `t4g.micro`, Cognito user pool + client, API Gateway HTTP API + Lambda, Next.js site |
| **3a** | ✅ Next.js 16 (App Router, TS, Tailwind v4, ESLint, Turbopack) scaffolded into the workspace as `@pft/web` |
| 3b    | shadcn/ui + Cognito sign-in (web)                                                                                |
| 3c    | First end-to-end vertical slice: Vehicles CRUD (schema → Lambda → Next.js login-gated page)                      |
| 4     | iOS app shell: SwiftUI scaffold, Amplify Swift + Cognito sign-in, vehicles list against the same API             |
| 5     | Fuel + maintenance entry flows; reminders engine                                                                 |
| 6     | Receipt photos (S3 presigned uploads); polish; TestFlight                                                        |

## License

TBD.
