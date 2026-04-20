# Week 2 — intake (`phase-1-intake`) ✅

## Objectives
- Ingest email and forms.
- Normalise inbound into a canonical structure.
- Show inbound work in a real queue.

## Delivered
- Inbound email webhook (`POST /api/webhooks/email`) — Postmark/SendGrid-shape with attachment support (base64 `Content`).
- Form endpoint (`POST /api/forms/submit`) — accepts JSON or `multipart/form-data` with file attachments (≤ 25 MB total).
- `@ops-hub/storage` package with pluggable `ObjectStorage`:
  - `LocalFsStorage` (default, `STORAGE_DRIVER=local`).
  - `S3Storage` (set `STORAGE_DRIVER=s3` + `S3_*` env).
  - Sanitised storage keys: `<tenantId>/<inboundItemId>/<rand>-<safeFileName>`.
- Attachment download (`GET /api/attachments/[id]`) with content-type and `Content-Disposition`.
- Contact match/dedupe by `(tenantId, lowercased email)` then `(tenantId, phone)` via `upsertContact`.
- `lib/intake.ts` service: idempotent ingestion (returns existing item if `(tenant, source, externalId)` already seen).
- Inbox list with filters: source, status, dateFrom, dateTo (URL-driven, server-rendered).
- Inbound detail view with raw payload (collapsible), attachment list, status pills.
- Retry path for FAILED items: `POST /api/inbound/[id]/retry` flips status back to RECEIVED; UI banner + button.

## Acceptance
- ✅ Email creates `InboundItem`.
- ✅ Form creates `InboundItem`.
- ✅ Attachments are stored (local fs or S3) and retrievable through the download endpoint.
- ✅ Users triage inbound items from the queue with filters.
- ✅ FAILED items show a retry control and re-enter the worker queue.
- ✅ `pnpm typecheck`, `pnpm lint`, `pnpm test` all green.
