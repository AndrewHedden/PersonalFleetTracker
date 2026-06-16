# CLAUDE.md

Context for Claude Code when working in this repo. Committed so it syncs between
machines (desktop ↔ laptop) via git — pull on the machine you sit down at, and
keep the **Current status** section below up to date before switching machines.

## What this is

**Stablebook** (GitHub: `AndrewHedden/PersonalFleetTracker`) — a personal
multi-vehicle fuel & maintenance tracker. Log fuel fills and maintenance, get
reminders before routine service comes due. Next.js web app + native SwiftUI iOS
companion, deployed to AWS, engineered to stay inside the AWS Free Tier.

## Current status / next steps

> Update this section before switching machines — it's the handoff note.

- **Last landed (`24a8c98`, all merged + deployed to the `andrew` stage):** Phase 5 entry flows + full entry CRUD + UX polish — fuel-first vehicle page, maintenance flow (custom tasks), fuel auto-calc, delete-retired-vehicle, latest-odometer header, edit/delete fuel & maintenance entries (click-a-row-to-open), local-date default fix, mobile date/odometer fix, and a **tabbed vehicle page** (Fill-ups default + Maintenance).
- **Data:** the `andrew` account now holds real **imported AutoCare history** (6 vehicles, 319 fuel, 73 maintenance) plus 3 leftover test vehicles (Audi/Badillac/Test 4 — duplicates of the imported Audi/Cadillac, can be deleted). One-off importer lived in gitignored `scripts/autocare-import/` (token already deleted).
- **Backlog (queued, not started):** (1) per-fill-up MPG display — frontend, math already reviewed; (2) see-all-entries path — frontend; (3) track vehicle purchase date — full-stack + migration; (4) quick-details/specs tab — full-stack + migration. Details in this machine's `~/.claude` memory.
- **Next up (roadmap):** the **maintenance reminders engine** — last piece of Phase 5 (`maintenance_schedules` tables exist; needs API + "due soon" + UI). Then Phase 4 iOS shell (`ios/` is a stub), then Phase 6 (receipt photos, polish, TestFlight).
- **Deploys from this machine:** AWS creds are under the `pft` profile; the gitignored `.env` (mise-loaded) sets `AWS_PROFILE=pft` + `AWS_REGION=us-east-1`. Deploy: `pnpm --filter @stablebook/infra sst:deploy --stage andrew`.

## Stack

| Layer    | Choice |
| -------- | ------ |
| Web      | Next.js 15/16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui |
| iOS      | Native SwiftUI + AWS Amplify Swift SDK |
| API      | API Gateway HTTP API + AWS Lambda (TypeScript) |
| Database | Amazon RDS Postgres `t4g.micro` single-AZ + Drizzle ORM |
| Auth     | Amazon Cognito user pools (JWT). **localStorage + Bearer tokens** on the client (moved off cookie sessions). |
| Infra    | SST v3 (TypeScript / AWS CDK) |
| Hosting  | Next.js SSR on Lambda + CloudFront via SST |
| CI/CD    | GitHub Actions |
| Tooling  | Node 22 LTS via mise · pnpm 11 workspaces |

## Layout

```
web/             # Next.js app
ios/             # Xcode project (SwiftUI)
infra/src/       # SST stacks: storage.ts (VPC+RDS) · auth.ts (Cognito) · api.ts (HTTP API+Lambda) · web.ts (Next.js site)
packages/db/     # Drizzle schema, queries, migrations
packages/shared/ # shared TS types / Zod schemas / API contract
packages/api/    # Lambda handlers
```

## Common commands (from repo root)

```bash
pnpm install            # install workspace deps (mise installs Node 22 first)
pnpm dev                # parallel dev servers
pnpm lint               # lint all workspaces
pnpm typecheck          # tsc --noEmit across workspaces
pnpm test               # tests across workspaces
pnpm format             # prettier --write .
pnpm format:check       # prettier --check . (CI uses this)
pnpm invoke:migrate [stage]   # apply pending Drizzle migrations via in-VPC Migrator Lambda (default stage: andrew)
```

SST (run via the infra workspace):

```bash
pnpm --filter @stablebook/infra exec sst install   # one-time: download SST platform code
pnpm --filter @stablebook/infra sst:diff           # preview infra changes
pnpm --filter @stablebook/infra sst:dev            # local dev (live Lambda + tunnel)
pnpm --filter @stablebook/infra sst:deploy --stage andrew
pnpm --filter @stablebook/infra sst:remove --stage andrew
```

## Conventions & gotchas

- **pnpm `nodeLinker: hoisted`** (set in `pnpm-workspace.yaml`) is required — Amplify Hosting's Next.js SSR packager can't follow pnpm's default symlinked `.pnpm/` layout.
- Native build scripts are explicitly allowlisted in `pnpm-workspace.yaml` (`allowBuilds`). Keep that list short and audited.
- **Cost posture:** no NAT Gateway (Lambdas share RDS VPC; Cognito JWT verified at API Gateway, not in Lambda), free-tier-sized RDS, HTTP API (not REST), `sst remove` enabled for non-production stages. If a Lambda ever needs outbound internet, prefer a specific VPC interface endpoint (~$7/mo) over a NAT Gateway (~$32/mo).
- Default personal dev stage is `andrew`.
- CI enforces `prettier --check` — run `pnpm format` before pushing.
