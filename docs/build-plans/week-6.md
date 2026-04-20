# Week 6 — hardening (`phase-5-hardening`) ✅

## Objectives
- Make the product stable for design partners and early paid pilots.

## Delivered
- **Role-based access control**:
  - `apps/web/src/lib/auth.ts` — `getAuthContext`, `hasRole`, `ROLES` (MANAGES_WORKFLOWS, REVIEWS_INBOUND, WORKS_CASES).
  - Applied to `POST /api/workflow-rules` and `PATCH/DELETE /api/workflow-rules/[id]` — returns 403 for non-managers.
  - Stub-session via `X-OpsHub-As` header for local testing until real auth (Clerk/Auth.js) lands.
- **Security headers + request IDs**:
  - `apps/web/src/middleware.ts` attaches `x-request-id` (uses incoming header or generates one), plus `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`.
- **Structured logger** (`apps/web/src/lib/logger.ts`) — JSON lines, level-routed to console. Single swap-point when the team adopts Sentry / Axiom.
- **More tests**:
  - `apps/workers/src/lib/extractor.test.ts` — heuristic extraction behaviour for leaks / boilers / neutral / confidence bounds.
  - `packages/workflows/src/assignment.test.ts` — rule ordering, inactive rules, no-rule case.
  - Combined with existing storage + state-machine tests, `pnpm test` now runs **12 unit tests**.
- **Pilot documentation**:
  - `docs/pilot/onboarding.md` — 30–60 minute pilot spin-up checklist.
  - `docs/pilot/admin-handbook.md` — where things live, how a request flows, role matrix, plan limits, incident runbook.
  - `docs/pilot/demo-script.md` — 10-minute scripted demo walkthrough.
  - `docs/pilot/launch-checklist.md` — go-live gate covering infra, data/tenancy, observability, people, comms, rollback.

## Acceptance
- ✅ No broken core flows in demo (end-to-end intake → case → schedule covered by unit tests + seeded data).
- ✅ First pilot can be onboarded with documented steps.
- ✅ Error paths visible via structured JSON logs + request IDs.
- ✅ Team can run outbound demos confidently (scripted).
- ✅ `pnpm typecheck`, `pnpm lint`, `pnpm test` all green.

## Known deferrals (logged as follow-ups)
- Real auth (Clerk / Auth.js) replacing the demo-tenant stub.
- Stripe SDK + signature verification on `/api/webhooks/stripe`.
- Calendar two-way sync.
- Row-level security at the DB layer (currently enforced at service layer).
