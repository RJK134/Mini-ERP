import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, Priority, Prisma } from "@ops-hub/db";
import { getCurrentTenant } from "@/lib/tenant";
import { getAuthContext, hasRole, ROLES } from "@/lib/auth";

async function requireManager(req: NextRequest, tenantId: string) {
  const ctx = await getAuthContext(tenantId, req.headers);
  if (!ctx || !hasRole(ctx, ROLES.MANAGES_WORKFLOWS)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  conditions: z
    .object({
      serviceType: z.string().optional(),
      priority: z.nativeEnum(Priority).optional(),
    })
    .optional(),
  actions: z
    .object({
      assignTeamId: z.string().optional(),
      assignUserId: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const guard = await requireManager(req, tenant.id);
  if (guard) return guard;
  const rule = await prisma.workflowRule.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!rule) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Patch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid patch", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.workflowRule.update({
    where: { id: rule.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.conditions !== undefined
        ? { conditions: parsed.data.conditions as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.actions !== undefined
        ? { actions: parsed.data.actions as Prisma.InputJsonValue }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, rule: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const guard = await requireManager(req, tenant.id);
  if (guard) return guard;
  const rule = await prisma.workflowRule.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!rule) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.workflowRule.delete({ where: { id: rule.id } });
  return NextResponse.json({ ok: true });
}
