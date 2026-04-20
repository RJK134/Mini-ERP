# Pilot onboarding checklist

Use this when spinning up a new pilot customer. 30–60 minutes if everything is ready.

## 1. Pre-call (before the customer is on)
- [ ] Confirm the customer signed the pilot agreement.
- [ ] Pick a workspace slug you'll use consistently in docs and inbound emails (e.g. `acme-plumbing`).
- [ ] Decide which vertical template to start with (default: specialist service / field-service).

## 2. Provision the workspace
- [ ] Visit `/onboarding` on the staging instance.
- [ ] Fill in workspace name, slug, owner name + email, first team name.
- [ ] Confirm the success screen shows the inbound email address:
      `inbound+<slug>@ops-hub.example`.
- [ ] Set `DEMO_TENANT_SLUG=<slug>` in the web app env so the pilot sees their own tenant.

## 3. Wire inbound email
- [ ] In Postmark (or SendGrid Parse), route `inbound+<slug>@<your-domain>` at the webhook:
      `POST https://<your-host>/api/webhooks/email`.
- [ ] Set `INBOUND_WEBHOOK_SECRET` and configure the provider to send the `X-Ops-Hub-Secret` header.
- [ ] Send a test email to the inbound address and confirm the `InboundItem` appears in `/inbox`.

## 4. Extraction
- [ ] Set `LLM_API_KEY` (Anthropic) and, if overriding, `LLM_MODEL`.
- [ ] Trigger a new inbound; confirm an `ExtractionRun` is written within ~5s.
- [ ] Walk the customer through accept / edit / reject on their first item.

## 5. Workflow
- [ ] Create at least one assignment rule under `/admin/rules` that reflects how the customer routes work.
- [ ] Confirm the SLA pill surfaces an overdue case (fast forward a seeded one if needed).

## 6. Outbound
- [ ] Set `OUTBOUND_API_KEY`, `OUTBOUND_PROVIDER`.
- [ ] Send the first acknowledgement draft and confirm it lands in the customer's inbox.

## 7. Hand-off
- [ ] Share `docs/pilot/admin-handbook.md` with the customer's admin.
- [ ] Book a 15-minute check-in 7 days out.
- [ ] Add their workspace slug to the internal pilot tracker.
