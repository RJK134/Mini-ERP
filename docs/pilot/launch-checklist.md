# Launch checklist

Gate for switching a new customer from "staging seed" to "production pilot".

## Infra
- [ ] Production Postgres provisioned, daily backups enabled, retention ≥ 14 days.
- [ ] Storage bucket (S3 / MinIO) provisioned, private, server-side encrypted.
- [ ] `DATABASE_URL`, `STORAGE_DRIVER=s3`, `S3_*` env vars set in prod.
- [ ] `INBOUND_WEBHOOK_SECRET`, `OUTBOUND_API_KEY`, `LLM_API_KEY` set in prod (never in repo).
- [ ] `STRIPE_WEBHOOK_SECRET` set if billing is live for this tenant.
- [ ] HTTPS everywhere. `x-request-id`, `x-frame-options`, `x-content-type-options` headers present (see `apps/web/src/middleware.ts`).

## Data + tenancy
- [ ] New tenant created via `/onboarding`, owner email confirmed.
- [ ] `Subscription` row created with the right `planCode` (or left at pilot).
- [ ] At least one `WorkflowRule` active.
- [ ] Smoke test: email to `inbound+<slug>@…` → shows in `/inbox` with a working extraction within 10s.

## Observability
- [ ] Logs shipping somewhere searchable. Look for `{"lvl":"error"}` lines from `lib/logger.ts`.
- [ ] `ActivityEvent` counts per day look sensible (dashboard shows them).
- [ ] Alert configured on: worker error rate, webhook 5xx rate, Postgres connection saturation.

## People
- [ ] Customer has admin handbook + demo script.
- [ ] Internal on-call rota covers pilot hours.
- [ ] Post-mortem template ready for any incident in the first 14 days.

## Comms
- [ ] Customer support inbox published (monitored).
- [ ] Pilot expectations doc signed off: SLA windows, what's in v1 vs roadmap, what triggers an invoice.

## Rollback
- [ ] Documented: how to pause inbound (remove webhook secret) without data loss.
- [ ] Documented: how to export a tenant's `InboundItem` + `Case` data for handback.
