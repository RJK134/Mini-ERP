import Link from "next/link";
import { prisma, InboundSource, InboundStatus, type Prisma } from "@ops-hub/db";
import { StatusPill, Card } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { InboxFilters, type InboxFilterState } from "./filters";

export const dynamic = "force-dynamic";

const SOURCES = Object.values(InboundSource);
const STATUSES = Object.values(InboundStatus);

function parseFilters(searchParams: Record<string, string | string[] | undefined>): InboxFilterState {
  const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null => {
    if (typeof value !== "string") return null;
    return (allowed as readonly string[]).includes(value) ? (value as T) : null;
  };
  return {
    source: oneOf(searchParams.source, SOURCES),
    status: oneOf(searchParams.status, STATUSES),
    dateFrom: typeof searchParams.dateFrom === "string" ? searchParams.dateFrom : null,
    dateTo: typeof searchParams.dateTo === "string" ? searchParams.dateTo : null,
  };
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenant = await getCurrentTenant();
  const filters = parseFilters(searchParams);

  const where: Prisma.InboundItemWhereInput = { tenantId: tenant.id };
  if (filters.source) where.source = filters.source as InboundSource;
  if (filters.status) where.status = filters.status as InboundStatus;
  if (filters.dateFrom || filters.dateTo) {
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
    if (filters.dateTo) range.lte = new Date(`${filters.dateTo}T23:59:59`);
    where.receivedAt = range;
  }

  const items = await prisma.inboundItem.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 200,
    select: {
      id: true,
      source: true,
      status: true,
      subject: true,
      fromName: true,
      fromEmail: true,
      receivedAt: true,
      _count: { select: { attachments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <span className="text-sm text-slate-500">{items.length} items</span>
      </header>

      <InboxFilters initial={filters} sources={SOURCES} statuses={STATUSES} />

      {items.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-sm text-slate-500">
            No inbound items match the filters.
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
                <th className="px-4 py-3">Attach</th>
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
                  <td className="px-4 py-3 text-slate-500">{item._count.attachments || ""}</td>
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
