import { Card, CardBody, CardHeader } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { getDashboardMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tenant = await getCurrentTenant();
  const m = await getDashboardMetrics(tenant.id);

  const stats = [
    { label: "Inbox pending review", value: m.inboxPending },
    { label: "Cases open", value: m.casesOpen },
    { label: "Cases overdue (SLA)", value: m.casesOverdue },
    { label: "Cases closed (7d)", value: m.casesClosedLast7d },
    { label: "Conversion (7d)", value: `${m.conversionRatePct}%` },
  ];

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">{tenant.name}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="text-xs uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className="mt-2 text-2xl font-semibold">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">Source mix (7d)</h2>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm">
              <li>Email: <strong>{m.bySource.EMAIL}</strong></li>
              <li>Form: <strong>{m.bySource.FORM}</strong></li>
              <li>Manual: <strong>{m.bySource.MANUAL}</strong></li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">Next actions</h2>
          </CardHeader>
          <CardBody>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Review inbound items awaiting extraction</li>
              <li>Confirm visit windows for scheduled cases</li>
              <li>Clear overdue tasks</li>
            </ul>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
