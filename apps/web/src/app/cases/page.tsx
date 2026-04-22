import Link from "next/link";
import { prisma, CaseStatus, Priority, type Prisma } from "@ops-hub/db";
import { Card, StatusPill } from "@ops-hub/ui";
import { isOverdue } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";
import { CasesFilters } from "./filters";

export const dynamic = "force-dynamic";

function parseFilters(sp: Record<string, string | string[] | undefined>) {
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => {
    if (typeof v !== "string") return null;
    return (allowed as readonly string[]).includes(v) ? (v as T) : null;
  };
  return {
    status: oneOf(sp.status, Object.values(CaseStatus)),
    priority: oneOf(sp.priority, Object.values(Priority)),
    assigneeId: typeof sp.assigneeId === "string" ? sp.assigneeId : null,
    teamId: typeof sp.teamId === "string" ? sp.teamId : null,
    q: typeof sp.q === "string" ? sp.q.trim() : "",
    view: sp.view === "board" ? "board" : "list",
  };
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const tenant = await getCurrentTenant();
  const filters = parseFilters(searchParams);

  const where: Prisma.CaseWhereInput = { tenantId: tenant.id };
  if (filters.status) where.status = filters.status as CaseStatus;
  if (filters.priority) where.priority = filters.priority as Priority;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.teamId) where.teamId = filters.teamId;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { reference: { contains: filters.q, mode: "insensitive" } },
      { summary: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [cases, users, teams] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { assignee: true },
      take: 500,
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

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <span className="text-sm text-slate-500">{cases.length} cases</span>
      </header>

      <CasesFilters
        initial={filters}
        users={users}
        teams={teams}
        statuses={Object.values(CaseStatus)}
        priorities={Object.values(Priority)}
      />

      {filters.view === "board" ? (
        <BoardView cases={cases} />
      ) : (
        <ListView cases={cases} />
      )}
    </div>
  );
}

type CaseRow = Awaited<ReturnType<typeof prisma.case.findMany>>[number] & {
  assignee: { id: string; name: string } | null;
};

function ListView({ cases }: { cases: CaseRow[] }) {
  if (cases.length === 0) {
    return <Card><div className="p-8 text-center text-sm text-slate-500">No cases match the filters.</div></Card>;
  }
  return (
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
                  {humanAge(c.createdAt)}{overdue && " (SLA breached)"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

const BOARD_COLUMNS: readonly CaseStatus[] = [
  CaseStatus.NEW,
  CaseStatus.TRIAGE,
  CaseStatus.AWAITING_INFO,
  CaseStatus.QUALIFIED,
  CaseStatus.SCHEDULED,
  CaseStatus.ACTIVE,
  CaseStatus.COMPLETED,
];

function BoardView({ cases }: { cases: CaseRow[] }) {
  const grouped = new Map<CaseStatus, CaseRow[]>();
  for (const col of BOARD_COLUMNS) grouped.set(col, []);
  for (const c of cases) {
    if (c.status === CaseStatus.CLOSED) continue;
    grouped.get(c.status)?.push(c);
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_COLUMNS.map((col) => {
        const rows = grouped.get(col) ?? [];
        return (
          <div key={col} className="w-64 shrink-0">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-600">
                {col.replace(/_/g, " ").toLowerCase()}
              </h3>
              <span className="text-xs text-slate-400">{rows.length}</span>
            </div>
            <div className="space-y-2 rounded bg-slate-100 p-2">
              {rows.map((c) => {
                const overdue = isOverdue(c.createdAt, c.priority);
                return (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block rounded border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50"
                  >
                    <div className="font-mono text-xs text-slate-500">{c.reference}</div>
                    <div className="mt-1 text-sm text-slate-900">{c.title}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span>{c.priority.toLowerCase()}</span>
                      {c.assignee && <span>· {c.assignee.name}</span>}
                      {overdue && <span className="text-red-600">· overdue</span>}
                    </div>
                  </Link>
                );
              })}
              {rows.length === 0 && <div className="p-2 text-xs text-slate-400">—</div>}
            </div>
          </div>
        );
      })}
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
