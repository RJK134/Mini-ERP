import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

// Internal notes piggy-back on ActivityEvent (type=CASE_UPDATED, payload.note)
// to keep them on the timeline without a new model. They're tenant-scoped
// and append-only, matching the ActivityEvent contract in CLAUDE.md.

const Create = z.object({
  body: z.string().min(1).max(4_000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const c = await prisma.case.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!c) return NextResponse.json({ error: "case not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Create.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const event = await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.CASE_UPDATED,
    caseId: c.id,
    payload: { kind: "note", body: parsed.data.body },
  });

  return NextResponse.json({ ok: true, eventId: event.id });
}
