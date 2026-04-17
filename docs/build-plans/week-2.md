# Week 2 — intake (`phase-1-intake`)

## Objectives
- Ingest email and forms.
- Normalise inbound into a canonical structure.
- Show inbound work in a real queue.

## Deliverables
- Inbound email webhook (`POST /api/webhooks/email`) — Postmark/SendGrid-compatible.
- Form endpoint (`POST /api/forms/submit`).
- Attachment storage via S3 (MinIO locally).
- Contact match/dedupe by email.
- Inbox list with filters: source, status, date, assignee.
- Inbound detail view with raw payload + normalised text.
- Retry path for FAILED items.

## Acceptance
- Email creates `InboundItem`.
- Form creates `InboundItem`.
- Attachments retrievable.
- Users triage inbound items from the queue.
- Failures visible and retryable.
