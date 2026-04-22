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
    { label: "Cases overdue (SLA)", value: m.casesOverdue, tone: m.casesOverdue > 0 ? "danger" : "neutral" as const },
    { label: "Cases closed (7d)", value: m.casesClosedLast7d },
    { label: "Conversion (7d)", value: `${m.conversionRatePct}%` },
    { label: "Median first response", value: fmtMinutes(m.medianFirstResponseMinutes) },
    { label: "Avg extraction latency", value: fmtMinutes(m.avgExtractionMinutes) },
  ];

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">{tenant.name}</p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className={s.tone === "danger" ? "border-red-200" : ""}>
            <CardBody>
              <div className="text-xs uppercase tracking-wide text-slate-500">{s.label}</div>
              <div className={`mt-2 text-2xl font-semibold ${s.tone === "danger" ? "text-red-700" : ""}`}>
                {s.value}
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-sm font-medium">Source mix (7d)</h2></CardHeader>
          <CardBody>
            <SourceBar label="Email" value={m.bySource.EMAIL} total={sourceTotal(m)} />
            <SourceBar label="Form" value={m.bySource.FORM} total={sourceTotal(m)} />
            <SourceBar label="Manual" value={m.bySource.MANUAL} total={sourceTotal(m)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-medium">Workload by assignee</h2></CardHeader>
          <CardBody>
            {m.workload.length === 0 ? (
              <div className="text-sm text-slate-500">No assigned cases.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {m.workload.map((w) => (
                  <li key={w.userId} className="flex items-center justify-between">
                    <span>{w.name}</span>
                    <span className="text-slate-500">
                      <strong className="text-slate-900">{w.open}</strong> open
                      {w.overdue > 0 && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                          {w.overdue} overdue
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function SourceBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
        <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function sourceTotal(m: { bySource: { EMAIL: number; FORM: number; MANUAL: number } }): number {
  return m.bySource.EMAIL + m.bySource.FORM + m.bySource.MANUAL;
}

function fmtMinutes(m: number | null): string {
  if (m === null) return "—";
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}
