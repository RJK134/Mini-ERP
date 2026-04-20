import Link from "next/link";
import { prisma } from "@ops-hub/db";
import { Card, CardBody, CardHeader } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const tenant = await getCurrentTenant();
  const [users, teams, rules] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "asc" } }),
    prisma.team.findMany({ where: { tenantId: tenant.id } }),
    prisma.workflowRule.findMany({ where: { tenantId: tenant.id } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Card>
        <CardHeader><h2 className="text-sm font-medium">Users</h2></CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-2">Name</th><th className="py-2">Email</th><th className="py-2">Role</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-slate-700">{u.email}</td>
                  <td className="py-2 text-slate-700">{u.role.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-medium">Teams</h2></CardHeader>
        <CardBody>
          {teams.length === 0 ? (
            <div className="text-sm text-slate-500">No teams.</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {teams.map((t) => <li key={t.id}>{t.name}</li>)}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Workflow rules ({rules.length})</h2>
            <Link href="/admin/rules" className="text-sm text-slate-700 hover:underline">
              Edit rules →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {rules.length === 0 ? (
            <div className="text-sm text-slate-500">No rules. Cases are assigned manually.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {rules.map((r) => (
                <li key={r.id} className="rounded border border-slate-200 p-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.isActive ? "active" : "inactive"} · trigger: {r.triggerType}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
