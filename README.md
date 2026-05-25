# PersonalFleetTracker

A personal fleet tracker: log fuel and maintenance for the vehicles you own, get reminders before routine maintenance comes due. Web app + native iOS companion, deployed on AWS.

> Status: **Phase 1** — data model defined (Drizzle schema + migrations). No infra deployed yet.

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

## Roadmap

| Phase | Scope                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| **0** | ✅ Repo skeleton, pnpm workspaces, lint/format/typecheck/CI scaffolding, Node pinning                            |
| **1** | ✅ Drizzle schema (`users`, `vehicles`, `fuel_entries`, 4 × `maintenance_*`), initial migration, seeded task catalog |
| 2     | SST stacks: Cognito user pool, RDS Postgres, API Gateway + Lambda, Next.js site                                  |
| 3     | First end-to-end vertical slice: Vehicles CRUD (schema → Lambda → Next.js login-gated page)                      |
| 4     | iOS app shell: SwiftUI scaffold, Amplify Swift + Cognito sign-in, vehicles list against the same API             |
| 5     | Fuel + maintenance entry flows; reminders engine                                                                 |
| 6     | Receipt photos (S3 presigned uploads); polish; TestFlight                                                        |

## License

TBD.
