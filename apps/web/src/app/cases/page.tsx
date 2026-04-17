import Link from "next/link";
import { prisma, CaseStatus } from "@ops-hub/db";
import { Card, StatusPill } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { isOverdue } from "@ops-hub/workflows";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const tenant = await getCurrentTenant();
  const cases = await prisma.case.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { assignee: true },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <span className="text-sm text-slate-500">{cases.length} cases</span>
      </header>

      {cases.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-sm text-slate-500">
            No cases yet. Approve an inbound item to create one.
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ref</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Age</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const overdue =
                  c.status !== CaseStatus.CLOSED &&
                  c.status !== CaseStatus.COMPLETED &&
                  isOverdue(c.createdAt, c.priority);
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      <Link href={`/cases/${c.id}`} className="hover:underline">{c.reference}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/cases/${c.id}`} className="text-slate-900 hover:underline">{c.title}</Link>
                    </td>
                    <td className="px-4 py-3"><StatusPill kind="case" value={c.status} /></td>
                    <td className="px-4 py-3 text-slate-700">{c.priority.toLowerCase()}</td>
                    <td className="px-4 py-3 text-slate-700">{c.assignee?.name ?? "—"}</td>
                    <td className={`px-4 py-3 ${overdue ? "text-red-600" : "text-slate-500"}`}>
                      {humanAge(c.createdAt)}{overdue && " (overdue)"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function humanAge(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
