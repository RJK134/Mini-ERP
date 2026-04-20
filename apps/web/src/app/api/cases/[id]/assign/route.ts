import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

const Patch = z.object({
  assigneeId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const c = await prisma.case.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Patch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }

  // Validate assignee/team belong to this tenant before touching anything.
  if (parsed.data.assigneeId) {
    const user = await prisma.user.findFirst({
      where: { id: parsed.data.assigneeId, tenantId: tenant.id },
    });
    if (!user) return NextResponse.json({ error: "assignee not in tenant" }, { status: 400 });
  }
  if (parsed.data.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: parsed.data.teamId, tenantId: tenant.id },
    });
    if (!team) return NextResponse.json({ error: "team not in tenant" }, { status: 400 });
  }

  const updated = await prisma.case.update({
    where: { id: c.id },
    data: {
      ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
      ...(parsed.data.teamId !== undefined ? { teamId: parsed.data.teamId } : {}),
    },
  });

  await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.ASSIGNED,
    caseId: c.id,
    payload: {
      assigneeId: parsed.data.assigneeId ?? null,
      teamId: parsed.data.teamId ?? null,
    },
  });

  return NextResponse.json({ ok: true, case: updated });
}
