import { prisma } from "@ops-hub/db";
import { Card, CardBody, CardHeader } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { RulesEditor, type RuleRow } from "./rules-editor";

export const dynamic = "force-dynamic";

export default async function RulesAdminPage() {
  const tenant = await getCurrentTenant();
  const [rules, users, teams] = await Promise.all([
    prisma.workflowRule.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
    }),
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

  const rows: RuleRow[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    conditions: r.conditions as RuleRow["conditions"],
    actions: r.actions as RuleRow["actions"],
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Assignment rules</h1>
      <p className="text-sm text-slate-600">
        Rules fire in order on CASE_CREATED. The first matching rule sets the team/assignee.
      </p>

      <Card>
        <CardHeader><h2 className="text-sm font-medium">Rules ({rows.length})</h2></CardHeader>
        <CardBody>
          <RulesEditor initial={rows} users={users} teams={teams} />
        </CardBody>
      </Card>
    </div>
  );
}
