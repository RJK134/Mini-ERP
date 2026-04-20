# Admin handbook

For workspace owners and admins running the Ops Hub day-to-day.

## Where things live

- **Dashboard (`/`)** — response time, ageing, conversion, workload.
- **Inbox (`/inbox`)** — shared queue for emails and form submissions. Filter by source, status, and date.
- **Cases (`/cases`)** — every approved request. List or `?view=board` for a Kanban by status.
- **Case detail (`/cases/<id>`)** — the working surface. Drafts, tasks, notes, assignment, status transitions, scheduling.
- **Settings (`/settings`)** — workspace, plan + usage.
- **Admin (`/admin`)** — users, teams, workflow rules summary.
- **Assignment rules (`/admin/rules`)** — create/activate/delete rules.

## How a request flows

```
Email / form → InboundItem → AI extraction → Reviewer edits + approves → Case
                                                        │
                                                        ├─ Ack draft (always)
                                                        └─ Request-for-info draft (if missing fields flagged)
```

From the Case, operators:
1. Edit + send drafts.
2. Work through tasks.
3. Move status along the state machine: `NEW → TRIAGE → AWAITING_INFO / QUALIFIED → SCHEDULED → ACTIVE → COMPLETED → CLOSED`.
4. Schedule (auto-drafts a CONFIRMATION email).
5. Leave internal notes on the timeline.

## Permissions (v1)

Roles and what they're allowed to do:

| Role      | Work cases | Review inbox | Edit workflow rules |
|-----------|:---------:|:------------:|:-------------------:|
| OWNER     | ✓         | ✓            | ✓                   |
| ADMIN     | ✓         | ✓            | ✓                   |
| MANAGER   | ✓         | ✓            | ✓                   |
| REVIEWER  | ✓         | ✓            |                     |
| OPERATOR  | ✓         |              |                     |
| VIEWER    | read-only | read-only    |                     |

## Plan limits

Set in `lib/billing.ts`. Pilot = 100 cases / 5 seats. Over-limit warnings surface on `/settings`. The Stripe webhook at `/api/webhooks/stripe` keeps `Subscription` rows in sync; manual override is to update the `Subscription` row directly.

## What to do when…

- **Inbound failed.** Open the item in `/inbox`, click "Retry ingestion". It flips back to `RECEIVED` and the worker picks it up.
- **Reviewer approved a case in error.** Move the case to `CLOSED` and start a new one. `InboundItem` is immutable by design.
- **A rule needs to fire conditionally on something we don't track.** File a ticket — v1 rules support `serviceType` and `priority`.
- **A customer reports they never got the confirmation.** Check `OutboundMessage` for the case; verify `OUTBOUND_API_KEY`/provider. All sends are logged.
