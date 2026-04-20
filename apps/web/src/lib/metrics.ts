import { prisma, ActivityType, CaseStatus, InboundStatus, Priority } from "@ops-hub/db";
import { isOverdue } from "@ops-hub/workflows";

export interface WorkloadRow {
  userId: string;
  name: string;
  open: number;
  overdue: number;
}

export interface DashboardMetrics {
  inboxPending: number;
  casesOpen: number;
  casesOverdue: number;
  casesClosedLast7d: number;
  conversionRatePct: number;
  bySource: { EMAIL: number; FORM: number; MANUAL: number };
  medianFirstResponseMinutes: number | null;
  avgExtractionMinutes: number | null;
  workload: WorkloadRow[];
}

const OPEN_STATUSES: CaseStatus[] = [
  CaseStatus.NEW,
  CaseStatus.TRIAGE,
  CaseStatus.AWAITING_INFO,
  CaseStatus.QUALIFIED,
  CaseStatus.SCHEDULED,
  CaseStatus.ACTIVE,
];

export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    inboxPending,
    openCases,
    inboundLast7d,
    casesClosedLast7d,
    bySourceRaw,
    respPairs,
    extractPairs,
    workloadRaw,
    users,
  ] = await Promise.all([
    prisma.inboundItem.count({
      where: {
        tenantId,
        status: {
          in: [
            InboundStatus.RECEIVED,
            InboundStatus.NORMALIZED,
            InboundStatus.EXTRACTED,
            InboundStatus.NEEDS_REVIEW,
          ],
        },
      },
    }),
    prisma.case.findMany({
      where: { tenantId, status: { in: OPEN_STATUSES } },
      select: { id: true, priority: true, createdAt: true, assigneeId: true },
    }),
    prisma.inboundItem.count({
      where: { tenantId, receivedAt: { gte: sevenDaysAgo } },
    }),
    prisma.case.count({
      where: { tenantId, closedAt: { gte: sevenDaysAgo } },
    }),
    prisma.inboundItem.groupBy({
      by: ["source"],
      where: { tenantId, receivedAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    // First reviewer action (approval) minus inbound receipt per item.
    firstResponsePairs(tenantId, sevenDaysAgo),
    // Extraction latency: gap from INBOUND_RECEIVED to EXTRACTION_RUN on same item.
    extractionLatencyPairs(tenantId, sevenDaysAgo),
    prisma.case.groupBy({
      by: ["assigneeId"],
      where: { tenantId, status: { in: OPEN_STATUSES }, assigneeId: { not: null } },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
  ]);

  const casesOverdue = openCases.filter((c) =>
    isOverdue(c.createdAt, c.priority as Priority),
  ).length;

  const bySource = { EMAIL: 0, FORM: 0, MANUAL: 0 } as DashboardMetrics["bySource"];
  for (const row of bySourceRaw) bySource[row.source] = row._count._all;

  const conversionRatePct =
    inboundLast7d === 0 ? 0 : Math.round((casesClosedLast7d / inboundLast7d) * 100);

  const overduePerUser = new Map<string, number>();
  for (const c of openCases) {
    if (!c.assigneeId) continue;
    if (isOverdue(c.createdAt, c.priority as Priority)) {
      overduePerUser.set(c.assigneeId, (overduePerUser.get(c.assigneeId) ?? 0) + 1);
    }
  }
  const byUserName = new Map(users.map((u) => [u.id, u.name]));
  const workload: WorkloadRow[] = workloadRaw
    .filter((r) => r.assigneeId)
    .map((r) => ({
      userId: r.assigneeId as string,
      name: byUserName.get(r.assigneeId as string) ?? "(unknown)",
      open: r._count._all,
      overdue: overduePerUser.get(r.assigneeId as string) ?? 0,
    }))
    .sort((a, b) => b.open - a.open);

  return {
    inboxPending,
    casesOpen: openCases.length,
    casesOverdue,
    casesClosedLast7d,
    conversionRatePct,
    bySource,
    medianFirstResponseMinutes: median(respPairs),
    avgExtractionMinutes: avg(extractPairs),
    workload,
  };
}

async function firstResponsePairs(tenantId: string, since: Date): Promise<number[]> {
  // Received → approved gap (in minutes) for inbound items approved within the window.
  const received = await prisma.activityEvent.findMany({
    where: {
      tenantId,
      type: ActivityType.INBOUND_RECEIVED,
      inboundItemId: { not: null },
      createdAt: { gte: since },
    },
    select: { inboundItemId: true, createdAt: true },
  });
  const approved = await prisma.activityEvent.findMany({
    where: {
      tenantId,
      type: ActivityType.EXTRACTION_APPROVED,
      inboundItemId: { not: null },
      createdAt: { gte: since },
    },
    select: { inboundItemId: true, createdAt: true },
  });
  const firstReceivedAt = new Map<string, Date>();
  for (const e of received) {
    const existing = e.inboundItemId ? firstReceivedAt.get(e.inboundItemId) : undefined;
    if (e.inboundItemId && (!existing || e.createdAt < existing)) {
      firstReceivedAt.set(e.inboundItemId, e.createdAt);
    }
  }
  const minutes: number[] = [];
  for (const e of approved) {
    if (!e.inboundItemId) continue;
    const start = firstReceivedAt.get(e.inboundItemId);
    if (!start) continue;
    minutes.push((e.createdAt.getTime() - start.getTime()) / 60_000);
  }
  return minutes;
}

async function extractionLatencyPairs(tenantId: string, since: Date): Promise<number[]> {
  const received = await prisma.activityEvent.findMany({
    where: {
      tenantId,
      type: ActivityType.INBOUND_RECEIVED,
      inboundItemId: { not: null },
      createdAt: { gte: since },
    },
    select: { inboundItemId: true, createdAt: true },
  });
  const extracted = await prisma.activityEvent.findMany({
    where: {
      tenantId,
      type: ActivityType.EXTRACTION_RUN,
      inboundItemId: { not: null },
      createdAt: { gte: since },
    },
    select: { inboundItemId: true, createdAt: true },
  });
  const firstReceivedAt = new Map<string, Date>();
  for (const e of received) {
    const existing = e.inboundItemId ? firstReceivedAt.get(e.inboundItemId) : undefined;
    if (e.inboundItemId && (!existing || e.createdAt < existing)) {
      firstReceivedAt.set(e.inboundItemId, e.createdAt);
    }
  }
  const minutes: number[] = [];
  for (const e of extracted) {
    if (!e.inboundItemId) continue;
    const start = firstReceivedAt.get(e.inboundItemId);
    if (!start) continue;
    minutes.push((e.createdAt.getTime() - start.getTime()) / 60_000);
  }
  return minutes;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const v = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.round(v);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
