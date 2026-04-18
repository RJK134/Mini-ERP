import { Card, CardBody, CardHeader } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const tenant = await getCurrentTenant();
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
        <CardHeader><h2 className="text-sm font-medium">Plan limits</h2></CardHeader>
        <CardBody>
          <div className="text-sm text-slate-600">
            Phase 1: unlimited for pilots. Stripe wiring lands in phase-4-gtm.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
