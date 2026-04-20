import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, Priority, Prisma } from "@ops-hub/db";
import { getCurrentTenant } from "@/lib/tenant";

const Create = z.object({
  name: z.string().min(1).max(120),
  isActive: z.boolean().optional(),
  conditions: z.object({
    serviceType: z.string().optional(),
    priority: z.nativeEnum(Priority).optional(),
  }),
  actions: z.object({
    assignTeamId: z.string().optional(),
    assignUserId: z.string().optional(),
  }),
});

export async function GET() {
  const tenant = await getCurrentTenant();
  const rules = await prisma.workflowRule.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const tenant = await getCurrentTenant();
  const body = await req.json().catch(() => null);
  const parsed = Create.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }
  const rule = await prisma.workflowRule.create({
    data: {
      tenantId: tenant.id,
      name: parsed.data.name,
      isActive: parsed.data.isActive ?? true,
      triggerType: "CASE_CREATED",
      conditions: parsed.data.conditions as Prisma.InputJsonValue,
      actions: parsed.data.actions as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ ok: true, rule });
}
