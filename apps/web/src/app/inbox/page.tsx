import Link from "next/link";
import { prisma } from "@ops-hub/db";
import { StatusPill, Card } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const tenant = await getCurrentTenant();
  const items = await prisma.inboundItem.findMany({
    where: { tenantId: tenant.id },
    orderBy: { receivedAt: "desc" },
    take: 100,
    select: {
      id: true,
      source: true,
      status: true,
      subject: true,
      fromName: true,
      fromEmail: true,
      receivedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <span className="text-sm text-slate-500">{items.length} items</span>
      </header>

      {items.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-sm text-slate-500">
            No inbound items yet. Email the inbound webhook or submit the contact form.
          </div>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Received</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/inbox/${item.id}`} className="text-slate-900 hover:underline">
                      {item.fromName ?? item.fromEmail ?? "(unknown)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.subject ?? "(no subject)"}</td>
                  <td className="px-4 py-3"><StatusPill kind="inbound" value={item.source} /></td>
                  <td className="px-4 py-3"><StatusPill kind="inbound" value={item.status} /></td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.receivedAt.toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
