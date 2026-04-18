# PRD — AI Operations Hub v1

## Decision
Build a verticalised **AI service operations inbox** for specialist service and appointment-led businesses. The first wedge: specialist service businesses (5–50 staff, 50–1,000 inbound requests/month) with fragmented admin.

## Positioning
- **Category.** AI service operations inbox.
- **Core promise.** Turn enquiries from email and forms into assigned, traceable work automatically.

## MVP v1 — must-haves
- Shared inbound queue (email + web forms).
- AI extraction of key request fields into structured records.
- Human review screen before case creation.
- Case lifecycle: `new → triage → awaiting_info → qualified → scheduled → active → completed → closed`.
- Rules-based or manual assignment.
- Draft acknowledgements and missing-information replies.
- Task and follow-up engine with due dates and overdue indicators.
- Lightweight scheduling handoff / booking state.
- Management dashboard: response time, ageing, conversion, workload.
- Full activity timeline and audit log.

## Out of scope (v1)
- Native telephony, route optimisation, full FSM planning.
- Payments and invoicing.
- Deep CRM functionality.
- Enterprise workflow builder / no-code DSL.
- Native mobile apps.
- Multi-channel beyond email + forms (unless a pilot customer specifically requires it).

## Principles
1. Build for one vertical first; keep the data model reusable.
2. Prefer human-in-the-loop AI over fully autonomous action.
3. Ship one complete workflow, not many partial modules.
4. Minimise external integrations in Phase 1.
5. Single database of record.
6. Every inbound item auditable.
7. Reliability and queue clarity > model sophistication.

## Integrations (v1)
| Integration | Status | Why |
|---|---|---|
| Inbound email webhook (Postmark / SendGrid Parse) | In | Core channel |
| Native product forms | In | Reliable second intake |
| Outbound email | In | Acknowledgements / follow-ups |
| LLM (extraction + drafting) | In | Core AI layer |
| Stripe | Late in build | Needed for pilots, not first milestone |
| WhatsApp, telephony, calendar sync, FSM, CRM, accounting | Out | Complexity with no proven ROI in Phase 1 |

## Launch criteria
- Inbound items captured reliably.
- Extraction good enough to save time even with review.
- Cases assignable and progressable.
- Response drafts reduce manual work.
- Managers see ageing and workload.
- Pilot onboarding works without bespoke engineering.
