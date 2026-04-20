import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, Prisma, UserRole } from "@ops-hub/db";

// One-shot onboarding: create a new Tenant + first Owner user + a default Team.
// Real auth/billing sign-up flows will replace this in production; for now
// it's the quickest path for a pilot operator to spin up a workspace.
const Body = z.object({
  workspaceName: z.string().min(1).max(100),
  workspaceSlug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]+[a-z0-9]$/, "lowercase letters, digits, hyphens"),
  ownerName: z.string().min(1).max(100),
  ownerEmail: z.string().email(),
  firstTeamName: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { workspaceName, workspaceSlug, ownerName, ownerEmail, firstTeamName } = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { slug: workspaceSlug } });
  if (existing) {
    return NextResponse.json({ error: "workspace slug already taken" }, { status: 409 });
  }

  const tenant = await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: { name: workspaceName, slug: workspaceSlug },
    });
    await tx.user.create({
      data: {
        tenantId: t.id,
        name: ownerName,
        email: ownerEmail.toLowerCase(),
        role: UserRole.OWNER,
      },
    });
    if (firstTeamName) {
      await tx.team.create({ data: { tenantId: t.id, name: firstTeamName } });
    }
    await tx.workflowRule.create({
      data: {
        tenantId: t.id,
        name: "Urgent cases surface first",
        triggerType: "CASE_CREATED",
        conditions: { priority: "URGENT" } as Prisma.InputJsonValue,
        actions: {} as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    return t;
  });

  return NextResponse.json({ ok: true, tenant });
}
