# AI Operations Hub

Turn enquiries from email and forms into assigned, traceable work — automatically.

> A verticalised AI operations inbox for specialist service and appointment-led businesses.

## What this is

A case-centric operations hub. Email and form submissions land in a shared inbox, AI extracts structured fields, a human approves, and the system creates a traceable `Case` with tasks, assignment, SLA timers, and an audit trail. Managers see response times, workload, and conversion on one dashboard.

This is **not** a CRM, not a helpdesk, not a full FSM. See `CLAUDE.md` and `docs/product/prd.md` for the strict scope.

## Repo layout

```
ops-hub/
  apps/
    web/          Next.js app (dashboard, inbox, cases, admin)
    workers/      background jobs (extraction, outbound email)
  packages/
    db/           Prisma schema, migrations, seed
    ui/           shared UI components
    config/       shared tsconfig
    prompts/      extraction and draft templates
    workflows/    typed workflow rules and event handlers
  docs/           product, architecture, build plans, QA
  infra/docker/   docker-compose for local Postgres + MinIO
  .github/        CI + issue templates
```

## Quickstart

```bash
# 1. Install
corepack enable
pnpm install

# 2. Bring up Postgres + MinIO
docker compose -f infra/docker/docker-compose.yml up -d

# 3. Configure env
cp .env.example .env
# edit .env

# 4. Migrate + seed
pnpm db:migrate
pnpm db:seed

# 5. Run
pnpm dev
```

Web app at `http://localhost:3000`. Demo tenant `acme-plumbing` pre-seeded.

## Architecture

See [`docs/architecture/system-design.md`](./docs/architecture/system-design.md).

The canonical flow:

```
Inbound (email/form) → InboundItem → ExtractionRun → Review → Case → Assignment → Tasks → Drafts → Sent
                                                                                                │
                                                                       ActivityEvent (append-only, audit + analytics)
```

## Phases

| Phase | Week | Focus |
|-------|------|-------|
| 0 — foundation | 1 | repo, schema, shell, seed, CI |
| 1 — intake | 2 | inbound email + forms, inbox UI |
| 2 — extraction | 3 | AI extraction, review, case creation, drafts |
| 3 — workflow | 4 | status engine, assignment, tasks, SLA |
| 4 — GTM | 5 | scheduling, dashboards, onboarding, billing |
| 5 — hardening | 6 | QA, monitoring, pilot docs |

Each phase lives in `docs/build-plans/week-N.md`.

## License

Proprietary. All rights reserved.
