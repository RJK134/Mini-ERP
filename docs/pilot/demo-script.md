# 10-minute demo script

Target: prospective pilot customer. Use the seeded `acme-plumbing` tenant.

## 0:00 — set the scene (30s)
> "You've got requests coming in from email and forms. Half get lost between folders and WhatsApp threads. Here's what the day feels like with Ops Hub."

## 0:30 — Dashboard (1m)
- Open `/`.
- Point at: inbox pending, cases open, overdue, median first-response, workload by assignee.
- "Everything on this page is live — it reads from our audit log, not an analytics pipeline."

## 1:30 — Inbox (2m)
- Open `/inbox`.
- Filter to `NEEDS_REVIEW` source `EMAIL`.
- Click a seeded item.
- Walk through: raw payload, normalised text, attachments, AI extraction with confidence.
- Edit the service type or priority to show the reviewer is in control.
- "The AI never touches authoritative records. It proposes; the reviewer approves."

## 3:30 — Approve to Case (1m)
- Click "Approve & create case".
- On the Case page, point at:
  - Case reference (e.g. AP-0042).
  - Auto-generated acknowledgement draft.
  - Request-for-info draft (if missing fields were flagged).
  - Activity timeline.

## 4:30 — Work the case (2m)
- Move status through the flow using the status control.
- Add a task with a due date.
- Add an internal note — show it on the timeline.
- Reassign to a different operator.

## 6:30 — Schedule (1m)
- From a QUALIFIED case, open the Schedule section.
- Pick a date/time, optionally a customer-facing window.
- Show that the case transitions to SCHEDULED and a CONFIRMATION draft is ready to send.

## 7:30 — Dashboards + board (1m)
- Back to `/cases?view=board` — show the Kanban.
- Highlight the red overdue markers on any stuck cards.
- Back to `/` — show the numbers moved.

## 8:30 — Rules (1m)
- `/admin/rules`.
- Add a rule: "urgent + leak_repair → assign field team". Save.
- "Rules fire on approval. First match wins."

## 9:30 — Close (30s)
> "Your reviewers save ~5 minutes per request. Your managers stop losing work. Your customers hear back within an hour. That's the pilot."
