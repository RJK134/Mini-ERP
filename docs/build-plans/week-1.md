# Week 1 — foundation (`phase-0-foundation`)

## Objectives
- Lock vertical + scope.
- Stand up repo, schema, and app shell.
- Establish canonical event flow.

## Deliverables
- `CLAUDE.md`, `docs/product/prd.md`, `docs/architecture/system-design.md`.
- Monorepo scaffold (`apps/web`, `apps/workers`, `packages/*`).
- Prisma schema and first migration.
- Seed script for demo tenant (`acme-plumbing`).
- Auth stub (Phase 1: demo tenant by slug).
- App shell: Dashboard, Inbox, Cases, Settings, Admin.
- Shared UI primitives (`@ops-hub/ui`).
- CI: lint + typecheck + Prisma validate + test.

## Acceptance
- App boots locally.
- DB migrates cleanly.
- Demo tenant visible.
- Empty states exist on all main routes.
- CI passes.
