# CLAUDE.md — AI Operations Hub

This file is the operating charter for any AI agent (including Claude Code) working on this repository. Read it fully before changing code.

## Product charter

**Category.** AI service operations inbox.

**Core promise.** Turn enquiries from email and forms into assigned, traceable work automatically.

**Initial ICP.** Specialist service businesses with 5–50 staff, 50–1,000 inbound requests per month, fragmented admin, and a need for qualification, assignment, scheduling, and follow-up.

**Non-goals for v1.** Native telephony, route optimisation, full FSM route planning, payments and invoicing, deep CRM, enterprise workflow builder, native mobile apps, channels beyond email and forms.

## Canonical event flow

All core product behaviour must follow this chain. Do not mutate authoritative records outside of it.

1. Inbound item received.
2. Raw payload stored on `InboundItem`.
3. Normalisation creates canonical text.
4. `ExtractionRun` runs asynchronously (AI never writes to `Case`).
5. Reviewer confirms/edits extracted data.
6. `Case` is created from approved data.
7. Assignment + due-date rules run.
8. Draft reply generated, reviewed, sent.
9. Dashboard + timeline update from `ActivityEvent`.

## Architectural rules

- Single database of record (PostgreSQL via Prisma).
- `Tenant` scope on every business table.
- `InboundItem` is immutable after ingestion.
- `ExtractionRun` stores AI output + confidence; never overwrites raw input.
- `ActivityEvent` is append-only; analytics read from it or from transactional tables.
- Keep workflow rules as typed JSON; no custom DSL.
- Human-in-the-loop by default — AI drafts, humans approve.
- Email + forms only for intake in Phase 1. No WhatsApp, no telephony.

## Coding standards

- TypeScript everywhere. No `any` in shipped code.
- Prefer named exports. Prefer server components in `apps/web` unless interactivity demands otherwise.
- Keep route handlers thin — push logic into `packages/workflows` or module services.
- Database access via `packages/db` client only.
- Prompts live in `packages/prompts`. Never inline prompts in app code.
- Tests live next to the code they cover.

## Branch convention

- `phase-0-foundation`
- `phase-1-intake`
- `phase-2-extraction`
- `phase-3-workflow`
- `phase-4-gtm`
- `phase-5-hardening`

## Acceptance gates (per phase)

1. Schema review.
2. API contract review.
3. UI flow walkthrough.
4. Integration test pass.
5. Demo recording.

## Out of scope (reject if asked)

- Native mobile apps.
- Route optimisation.
- Payments / invoicing.
- Telephony / SMS.
- CRM sync (HubSpot, Salesforce, Zoho).
- No-code workflow builder UI.
- Per-customer custom fields (until release 2).
