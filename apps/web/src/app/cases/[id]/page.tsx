import { notFound } from "next/navigation";
import { prisma, CaseStatus } from "@ops-hub/db";
import { Card, CardBody, CardHeader, StatusPill } from "@ops-hub/ui";
import { allowedTransitions, isOverdue } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";
import { DraftsPanel, type DraftRow } from "./drafts-panel";
import { TasksPanel, type TaskRow } from "./tasks-panel";
import { AssignControl, NoteForm, StatusControl } from "./controls";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const c = await prisma.case.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      assignee: true,
      team: true,
      contact: true,
      tasks: { orderBy: [{ status: "asc" }, { dueAt: "asc" }], include: { assignee: true } },
      drafts: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "desc" } },
      activityEvents: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });

  if (!c) notFound();

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const overdue =
    c.status !== CaseStatus.CLOSED &&
    c.status !== CaseStatus.COMPLETED &&
    isOverdue(c.createdAt, c.priority);

  const draftRows: DraftRow[] = c.drafts.map((d) => ({
    id: d.id,
    draftType: d.draftType,
    subject: d.subject,
    body: d.body,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
  }));

  const taskRows: TaskRow[] = c.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    assigneeName: t.assignee?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <div className="font-mono text-xs text-slate-500">{c.reference}</div>
        <h1 className="mt-1 text-2xl font-semibold">{c.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusPill kind="case" value={c.status} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{c.priority.toLowerCase()}</span>
          {c.serviceType && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{c.serviceType}</span>
          )}
          {overdue && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">SLA breached</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><h2 className="text-sm font-medium">Summary</h2></CardHeader>
          <CardBody>
            <p className="text-sm text-slate-800">{c.summary ?? "—"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-slate-500">Location</dt><dd>{c.locationText ?? "—"}</dd>
              <dt className="text-slate-500">Requested</dt><dd>{c.requestedDate?.toISOString().slice(0, 10) ?? "—"}</dd>
              <dt className="text-slate-500">Scheduled</dt><dd>{c.scheduledAt?.toISOString().slice(0, 16) ?? "—"}</dd>
              <dt className="text-slate-500">Contact</dt>
              <dd>
                {c.contact ? (
                  <>
                    {`${c.contact.firstName ?? ""} ${c.contact.lastName ?? ""}`.trim() || "—"}
                    {c.contact.email && <span className="ml-1 text-slate-500">&lt;{c.contact.email}&gt;</span>}
                  </>
                ) : "—"}
              </dd>
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="text-sm font-medium">Status</h2></CardHeader>
            <CardBody>
              <StatusControl
                caseId={c.id}
                current={c.status}
                allowed={allowedTransitions(c.status)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-medium">Assignment</h2></CardHeader>
            <CardBody>
              <AssignControl
                caseId={c.id}
                currentAssigneeId={c.assigneeId}
                currentTeamId={c.teamId}
                users={users}
                teams={teams}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader><h2 className="text-sm font-medium">Tasks ({c.tasks.length})</h2></CardHeader>
        <CardBody>
          <TasksPanel caseId={c.id} tasks={taskRows} />
        </CardBody>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-sm font-medium">Internal note</h2></CardHeader>
          <CardBody>
            <NoteForm caseId={c.id} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-medium">Activity</h2></CardHeader>
          <CardBody>
            {c.activityEvents.length === 0 ? (
              <div className="text-sm text-slate-500">No activity yet.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {c.activityEvents.map((e) => {
                  const payload = e.payload as { kind?: string; body?: string } | null;
                  const isNote = e.type === "CASE_UPDATED" && payload?.kind === "note";
                  return (
                    <li key={e.id} className={isNote ? "rounded border border-slate-200 p-2" : ""}>
                      <div className="flex justify-between">
                        <span className="text-slate-700">
                          {isNote ? "note" : e.type.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {e.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                        </span>
                      </div>
                      {isNote && payload?.body && (
                        <p className="mt-1 whitespace-pre-wrap text-slate-800">{payload.body}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><h2 className="text-sm font-medium">Drafts ({c.drafts.length})</h2></CardHeader>
        <CardBody>
          <DraftsPanel drafts={draftRows} />
        </CardBody>
      </Card>

      {c.messages.length > 0 && (
        <Card className="mt-4">
          <CardHeader><h2 className="text-sm font-medium">Sent messages ({c.messages.length})</h2></CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              {c.messages.map((m) => (
                <li key={m.id} className="rounded border border-slate-200 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900">{m.subject ?? "(no subject)"}</span>
                    <span className="text-xs text-slate-500">
                      {m.sentAt?.toISOString().replace("T", " ").slice(0, 16) ?? "—"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">to {m.recipient}</div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
