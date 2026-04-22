import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, ActivityType, CaseStatus } from "@ops-hub/db";
import { canTransition, recordEvent, timestampsFor } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

const Patch = z.object({
  to: z.nativeEnum(CaseStatus),
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

  if (!canTransition(c.status, parsed.data.to)) {
    return NextResponse.json(
      { error: `cannot transition from ${c.status} to ${parsed.data.to}` },
      { status: 409 },
    );
  }

  const updated = await prisma.case.update({
    where: { id: c.id },
    data: { status: parsed.data.to, ...timestampsFor(parsed.data.to) },
  });

  await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.STATUS_CHANGED,
    caseId: c.id,
    payload: { from: c.status, to: parsed.data.to },
  });

  return NextResponse.json({ ok: true, case: updated });
}
