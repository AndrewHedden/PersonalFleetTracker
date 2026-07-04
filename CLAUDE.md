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

- **Last landed (`9aa492f`, all merged + deployed to `andrew`; DB at migration `0003`) — PHASE 5 COMPLETE.** The **maintenance reminders engine**: pure `computeScheduleStatus`/`addMonths` in `packages/shared/src/reminders.ts` (due-soon 500 mi / 30 days; baseline = latest matching maintenance entry → vehicle purchase → "log to start"), `enrichSchedules` API helper, 5 routes (`GET/POST /v1/vehicles/{id}/schedules`, `PATCH/DELETE .../{scheduleId}`, `GET /v1/reminders` roll-up), a `VehicleSchedules` panel on the Maintenance tab (status pills + add/edit/delete), and dashboard due/overdue badges. No migration (table pre-existed).
- **Earlier in Phase 5:** entry flows + full entry CRUD + UX polish, per-fill-up **MPG** (`mpg.ts`), **see-all-entries** pages, **vehicle purchase date** (migration 0002), **quick-details/specs tab** (JSONB `specs`, migration 0003). Vehicle page has **3 tabs** (Fill-ups / Maintenance / Details).
- **Data:** the `andrew` account holds real **imported AutoCare history** (6 vehicles, 319 fuel, 73 maintenance) plus 3 leftover test vehicles (Audi/Badillac/Test 4 — duplicates, fine to delete). One-off importer was gitignored `scripts/autocare-import/` (token deleted).
- **Next up (roadmap):** **Phase 4 iOS shell** (`ios/` is a README stub — needs SwiftUI scaffold + Amplify/Cognito sign-in + vehicles list against the same API). Then Phase 6 (receipt photos via S3 presigned, polish, TestFlight).
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
