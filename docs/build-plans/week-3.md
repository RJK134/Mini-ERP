# Week 3 — extraction (`phase-2-extraction`) ✅

## Objectives
- Turn inbound items into structured records.
- Keep humans in control.

## Delivered
- Real Anthropic SDK extraction in the worker with prompt-caching on the system prompt:
  - `apps/workers/src/lib/extractor.ts`.
  - Pinned to `claude-sonnet-4-6` (override with `LLM_MODEL`).
  - Deterministic heuristic fallback when `LLM_API_KEY` is not set — lets CI and local dev run without a key.
  - Strict JSON parsing with `sanitise()` — bad model output degrades to a safe shape instead of crashing.
- Prompt templates versioned in `@ops-hub/prompts`, bumped to `extract.v2`. Separate `EXTRACTION_SYSTEM_PROMPT` + `EXTRACTION_USER_TEMPLATE` so the system prompt can be cached.
- `ExtractionRun.confidenceScore` populated; `extractedData.missingFields` included.
- Human review screen — **edit-then-approve**:
  - Reviewer can edit serviceType / priority / location / preferredWindow / summary / missingFields before approving.
  - Approve endpoint (`POST /api/inbound/[id]/approve`) accepts a JSON patch of the edits and merges them with the AI output.
  - The reviewer's final values are persisted as a second `ExtractionRun` with `modelName: "human-review"` and confidence 1.
  - Reject endpoint unchanged.
- Case creation from approved extraction, including assignment rule evaluation.
- Draft generation on approval:
  - Always: `ACKNOWLEDGEMENT` draft personalised to the contact.
  - Conditional: `REQUEST_FOR_INFO` draft when `missingFields.length > 0`, bulleted with the flagged fields.
- Draft editing (`PATCH /api/drafts/[id]`) and sending (`POST /api/drafts/[id]/send`):
  - `lib/outbound.ts` sender with a dev/CI stub; real Postmark call to be wired in `phase-4-gtm`.
  - Sending creates an `OutboundMessage`, flips draft status to `sent`, records `MESSAGE_SENT`.
- Case detail drafts panel with inline edit + send buttons; sent-messages list appears once there's history.
- Activity logging for every step: `INBOUND_RECEIVED` → `EXTRACTION_RUN` → `EXTRACTION_APPROVED` → `CASE_CREATED` → `ASSIGNED` (if rule matched) → `DRAFT_GENERATED` (×N) → `MESSAGE_SENT`.

## Acceptance
- ✅ Reviewer can accept / edit / reject extracted fields.
- ✅ Approved extraction creates a `Case` (status `TRIAGE` or `AWAITING_INFO` depending on missing fields).
- ✅ Initial reply draft can be edited and sent.
- ✅ Timeline shows every step.
- ✅ Runs green with or without `LLM_API_KEY`.
