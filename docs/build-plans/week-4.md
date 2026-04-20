# Week 4 — workflow (`phase-3-workflow`) ✅

## Objectives
- Turn smart inbox into an operational execution tool.

## Delivered
- **Case state machine** in `@ops-hub/workflows`:
  - Explicit `ALLOWED_TRANSITIONS` graph covering `NEW → TRIAGE → AWAITING_INFO/QUALIFIED → SCHEDULED → ACTIVE → COMPLETED → CLOSED` plus sensible back-edges.
  - `canTransition`, `allowedTransitions`, `timestampsFor` (stamps `qualifiedAt` / `scheduledAt` / `closedAt` on entry).
  - Unit tests (node:test) covering happy path, bad jumps, and CLOSED being terminal.
- **Case status endpoint** `POST /api/cases/[id]/status`: validates the transition, stamps lifecycle timestamps, records `STATUS_CHANGED`.
- **Case assign endpoint** `POST /api/cases/[id]/assign`: per-request change of assignee/team with tenant isolation; records `ASSIGNED`.
- **Tasks**:
  - `POST /api/cases/[id]/tasks` — create.
  - `PATCH /api/tasks/[id]` — update title/description/status/dueAt/assignee.
  - `DELETE /api/tasks/[id]` — remove.
  - Case-detail TasksPanel with inline add, advance status, delete.
- **Internal notes**: `POST /api/cases/[id]/notes` appends an `ActivityEvent` (`CASE_UPDATED` + `payload.kind = "note"`). Timeline renders them as readable blocks.
- **Case list**: filters (status, priority, assignee, team) + full-text search across reference / title / summary; URL-driven so filters survive refresh.
- **Case board**: `?view=board` Kanban view grouped by status, with per-column overdue markers.
- **Overdue / SLA UI**: list + board both surface SLA-breached cards via `isOverdue`; case header shows a red pill.
- **Assignment rules admin**: `/admin/rules` with create / activate / delete. Rules fire in order on CASE_CREATED.

## Acceptance
- ✅ Managers can configure assignment rules (admin UI + CRUD API).
- ✅ Operators work entirely from cases/tasks — no email context needed.
- ✅ Overdue work is clearly surfaced (list, board, case header).
- ✅ Stalled work visible immediately via the board.
- ✅ `pnpm typecheck`, `pnpm lint`, `pnpm test` all green (state-machine tests added).
