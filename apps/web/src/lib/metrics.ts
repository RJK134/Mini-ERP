import { prisma, CaseStatus, InboundStatus, Priority } from "@ops-hub/db";
import { isOverdue } from "@ops-hub/workflows";

export interface DashboardMetrics {
  inboxPending: number;
  casesOpen: number;
  casesOverdue: number;
  casesClosedLast7d: number;
  conversionRatePct: number;
  bySource: { EMAIL: number; FORM: number; MANUAL: number };
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

  const [inboxPending, openCases, inboundLast7d, casesClosedLast7d, bySourceRaw] = await Promise.all([
    prisma.inboundItem.count({
      where: {
        tenantId,
        status: { in: [InboundStatus.RECEIVED, InboundStatus.NORMALIZED, InboundStatus.EXTRACTED, InboundStatus.NEEDS_REVIEW] },
      },
    }),
    prisma.case.findMany({
      where: { tenantId, status: { in: OPEN_STATUSES } },
      select: { id: true, priority: true, createdAt: true },
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
  ]);

  const casesOverdue = openCases.filter((c) =>
    isOverdue(c.createdAt, c.priority as Priority),
  ).length;

  const bySource = { EMAIL: 0, FORM: 0, MANUAL: 0 } as DashboardMetrics["bySource"];
  for (const row of bySourceRaw) {
    bySource[row.source] = row._count._all;
  }

  const conversionRatePct =
    inboundLast7d === 0 ? 0 : Math.round((casesClosedLast7d / inboundLast7d) * 100);

  return {
    inboxPending,
    casesOpen: openCases.length,
    casesOverdue,
    casesClosedLast7d,
    conversionRatePct,
    bySource,
  };
}
