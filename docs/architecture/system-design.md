# System design

## Canonical event flow

```
┌─────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────┐    ┌──────┐
│ Inbound │ -> │ InboundItem  │ -> │ ExtractionRun  │ -> │ Review   │ -> │ Case │
│ (email, │    │ (raw + norm) │    │ (AI output +   │    │ (human)  │    │      │
│  form)  │    │              │    │  confidence)   │    │          │    │      │
└─────────┘    └──────────────┘    └────────────────┘    └──────────┘    └───┬──┘
                                                                              │
                                                              ┌───────────────┼───────────────┐
                                                              v               v               v
                                                         Assignment       Tasks          Drafts → Send
                                                                              │
                                                                    ActivityEvent (append-only)
                                                                              │
                                                                      Dashboard / timeline
```

AI never mutates authoritative records. Extraction writes to `ExtractionRun`. A human approves, and only the approval handler writes to `Case`.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App shell | Next.js + TypeScript | One deployable, typed routes, server components |
| DB | PostgreSQL | Default. Well-understood. |
| ORM | Prisma | Type-safe, good migrations, good DX |
| Auth | Clerk / Auth.js / magic link | Choose least-complex tenant-capable option |
| Background jobs | Worker process with DB-backed polling | Introduce Redis/BullMQ only if throughput demands it |
| Email ingestion | Postmark inbound or SendGrid Parse | No IMAP polling |
| Forms | Native product-hosted | No third party in v1 |
| Storage | S3-compatible (MinIO locally) | Standard |
| AI | One extraction + one drafting service | Stable prompt templates in `@ops-hub/prompts` |
| Billing | Stripe, added late | Pilot-readiness only |

## Multi-tenancy

- `Tenant` is the root of every business table.
- Every query filters by `tenantId`. Enforced at the service layer today; add row-level security if/when appropriate.
- Tenants resolve from auth session today (stubbed with demo slug in Phase 0).

## Prisma strategy

- Narrow, explicit schema. No premature polymorphism.
- Enums for lifecycle-critical states.
- `Json` only for variable extraction metadata and workflow-rule configuration.
- Analytics read `ActivityEvent` first; denormalise later if needed.

## Modules

- `packages/db` — Prisma client + enums + seed.
- `packages/workflows` — assignment, SLA, case reference, event recorder.
- `packages/prompts` — extraction + draft templates with pinned versions.
- `packages/ui` — shared components.
- `apps/web` — Next.js app (dashboard, inbox, cases, admin, API).
- `apps/workers` — polling loop that runs extraction + draft jobs.

## Phase simplifications

- One tenant template, one vertical.
- Email + forms only.
- One outbound channel (email).
- Role-based permissions, not policy engine.
- One scheduling model: booking state + optional calendar export.
- Workflow rules as validated JSON.
- Dashboard reads transactional tables first.
