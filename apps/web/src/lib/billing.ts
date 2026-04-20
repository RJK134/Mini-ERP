import { prisma } from "@ops-hub/db";

// Plan catalogue. Kept in code (not DB) so the shape is typed and stable.
// In production the Stripe Price ID per plan would be wired through env.
export interface PlanDefinition {
  code: string;
  label: string;
  monthlyGbp: number;
  caseLimit: number | null; // null = unlimited
  seatLimit: number | null;
  features: string[];
}

export const PLANS: readonly PlanDefinition[] = [
  {
    code: "pilot",
    label: "Pilot",
    monthlyGbp: 0,
    caseLimit: 100,
    seatLimit: 5,
    features: ["Shared inbox", "AI extraction", "Case workflow", "Email sending"],
  },
  {
    code: "team",
    label: "Team",
    monthlyGbp: 99,
    caseLimit: 1_000,
    seatLimit: 15,
    features: ["Everything in Pilot", "Assignment rules", "Dashboards", "Priority support"],
  },
  {
    code: "scale",
    label: "Scale",
    monthlyGbp: 299,
    caseLimit: null,
    seatLimit: null,
    features: ["Everything in Team", "Unlimited seats + cases", "Audit log export"],
  },
];

export function planByCode(code: string | null | undefined): PlanDefinition {
  return PLANS.find((p) => p.code === code) ?? PLANS[0]!;
}

export interface PlanUsage {
  plan: PlanDefinition;
  status: string;
  cases: { used: number; limit: number | null; overLimit: boolean };
  seats: { used: number; limit: number | null; overLimit: boolean };
}

export async function getPlanUsage(tenantId: string): Promise<PlanUsage> {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId, status: { in: ["active", "trialing", "past_due"] } },
    orderBy: { createdAt: "desc" },
  });
  const plan = planByCode(sub?.planCode);
  const [cases, seats] = await Promise.all([
    prisma.case.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, isActive: true } }),
  ]);
  return {
    plan,
    status: sub?.status ?? "trialing",
    cases: {
      used: cases,
      limit: plan.caseLimit,
      overLimit: plan.caseLimit !== null && cases >= plan.caseLimit,
    },
    seats: {
      used: seats,
      limit: plan.seatLimit,
      overLimit: plan.seatLimit !== null && seats >= plan.seatLimit,
    },
  };
}
