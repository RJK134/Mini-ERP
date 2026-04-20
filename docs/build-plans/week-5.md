# Week 5 — GTM (`phase-4-gtm`) ✅

## Objectives
- Make the product commercially usable for pilots.

## Delivered
- **Scheduling handoff** — `POST /api/cases/[id]/schedule`:
  - Validated transition into `SCHEDULED` via the Phase 3 state machine.
  - Stamps `scheduledAt`, records `STATUS_CHANGED` with the scheduled time.
  - Auto-generates a `CONFIRMATION` `MessageDraft` when the contact has an email, ready for reviewer send. (No calendar round-trip in v1 — booking-ready state + confirmation email is what pilots need.)
  - `ScheduleForm` on the case detail page, shown when status is `QUALIFIED` or `AWAITING_INFO`.
- **Dashboard** — real KPI surface:
  - Median first-response time (INBOUND_RECEIVED → EXTRACTION_APPROVED).
  - Average extraction latency (INBOUND_RECEIVED → EXTRACTION_RUN).
  - Inbox pending, open cases, overdue (SLA), closed in last 7d, 7d conversion.
  - Source mix bar chart, workload per assignee with overdue pill.
- **Onboarding wizard** — `/onboarding`:
  - `POST /api/onboarding` creates a new `Tenant` + owner `User` + optional `Team` + a starter URGENT-priority `WorkflowRule` in a single transaction.
  - Form auto-slugifies the workspace name and shows the inbound email address on success.
- **Billing / plan limits** — thin but usable:
  - `lib/billing.ts` defines three plans (Pilot / Team / Scale) with case + seat caps.
  - `getPlanUsage` reports used/limit/over-limit, driven by the `Subscription` row.
  - `POST /api/webhooks/stripe` skeleton handles `customer.subscription.{created,updated,deleted}` and upserts a `Subscription` row (SDK + signature verification land in phase-5-hardening; endpoint 501s until `STRIPE_WEBHOOK_SECRET` is set).
  - Settings page shows the current plan, usage, and comparison table.

## Acceptance
- ✅ A qualified case can be moved to scheduled with an auto-generated confirmation draft.
- ✅ Dashboard reflects live operational data (timings from `ActivityEvent`, open/overdue from transactional tables).
- ✅ New customer workspace can be created and configured via `/onboarding`.
- ✅ Plan limits surface in settings; webhook endpoint ready to be pointed at Stripe once the SDK lands.
- ✅ `pnpm typecheck`, `pnpm lint`, `pnpm test` all green.
