import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  prisma,
  ActivityType,
  CaseStatus,
  DraftType,
} from "@ops-hub/db";
import { canTransition, recordEvent, timestampsFor } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

const Body = z.object({
  scheduledAt: z.string().datetime(),
  window: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const c = await prisma.case.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: { contact: true },
  });
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (!canTransition(c.status, CaseStatus.SCHEDULED)) {
    return NextResponse.json(
      { error: `cannot transition from ${c.status} to SCHEDULED` },
      { status: 409 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  const windowText = parsed.data.window ?? scheduledAt.toISOString().replace("T", " ").slice(0, 16);

  const updated = await prisma.case.update({
    where: { id: c.id },
    data: {
      status: CaseStatus.SCHEDULED,
      ...timestampsFor(CaseStatus.SCHEDULED),
      scheduledAt,
    },
  });

  // Auto-generate a CONFIRMATION draft if the contact has an email.
  let draft: { id: string } | null = null;
  if (c.contact?.email) {
    const firstName = c.contact.firstName ?? "there";
    const body =
      `Hi ${firstName},\n\n` +
      `This is confirmation for your ${c.serviceType ?? "service"} visit (ref ${c.reference}).\n\n` +
      `Window: ${windowText}\n\n` +
      `If you need to reschedule, just reply to this email.\n\n` +
      `Best,\nThe ${tenant.name} team`;
    draft = await prisma.messageDraft.create({
      data: {
        tenantId: tenant.id,
        caseId: c.id,
        draftType: DraftType.CONFIRMATION,
        subject: `Confirmed: ${c.title}`,
        body,
        status: "pending_review",
      },
    });
  }

  await Promise.all([
    recordEvent({
      tenantId: tenant.id,
      type: ActivityType.STATUS_CHANGED,
      caseId: c.id,
      payload: { from: c.status, to: CaseStatus.SCHEDULED, scheduledAt: scheduledAt.toISOString() },
    }),
    draft
      ? recordEvent({
          tenantId: tenant.id,
          type: ActivityType.DRAFT_GENERATED,
          caseId: c.id,
          payload: { draftType: DraftType.CONFIRMATION, draftId: draft.id },
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true, case: updated, draftId: draft?.id ?? null });
}
