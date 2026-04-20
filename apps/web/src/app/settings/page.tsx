import Link from "next/link";
import { Card, CardBody, CardHeader } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { getPlanUsage, PLANS } from "@/lib/billing";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tenant = await getCurrentTenant();
  const usage = await getPlanUsage(tenant.id);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><h2 className="text-sm font-medium">Workspace</h2></CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Name</dt><dd>{tenant.name}</dd>
            <dt className="text-slate-500">Slug</dt><dd className="font-mono">{tenant.slug}</dd>
            <dt className="text-slate-500">Inbound email</dt>
            <dd className="font-mono">inbound+{tenant.slug}@ops-hub.example</dd>
          </dl>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader><h2 className="text-sm font-medium">Plan — {usage.plan.label}</h2></CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd>{usage.status}</dd>
            <dt className="text-slate-500">Cases</dt>
            <dd>
              {usage.cases.used} / {usage.cases.limit ?? "∞"}
              {usage.cases.overLimit && <span className="ml-2 text-red-700">over limit</span>}
            </dd>
            <dt className="text-slate-500">Seats</dt>
            <dd>
              {usage.seats.used} / {usage.seats.limit ?? "∞"}
              {usage.seats.overLimit && <span className="ml-2 text-red-700">over limit</span>}
            </dd>
            <dt className="text-slate-500">Monthly</dt>
            <dd>£{usage.plan.monthlyGbp}</dd>
          </dl>

          <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">All plans</h3>
          <table className="mt-1 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="py-1">Plan</th><th>Cases</th><th>Seats</th><th className="text-right">Monthly</th></tr>
            </thead>
            <tbody>
              {PLANS.map((p) => (
                <tr key={p.code} className={p.code === usage.plan.code ? "bg-slate-50" : ""}>
                  <td className="py-1">{p.label}</td>
                  <td>{p.caseLimit ?? "∞"}</td>
                  <td>{p.seatLimit ?? "∞"}</td>
                  <td className="text-right">£{p.monthlyGbp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-xs text-slate-500">
            Stripe upgrade flow lands in phase-5-hardening. Today, the plan is driven by the{" "}
            <code className="rounded bg-slate-100 px-1">Subscription</code> row for the tenant — webhooks
            at <code className="rounded bg-slate-100 px-1">/api/webhooks/stripe</code> keep it in sync.
          </div>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader><h2 className="text-sm font-medium">Quick links</h2></CardHeader>
        <CardBody>
          <ul className="space-y-1 text-sm">
            <li><Link className="hover:underline" href="/admin/rules">Assignment rules</Link></li>
            <li><Link className="hover:underline" href="/onboarding">Create another workspace</Link></li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
