import { NextResponse, type NextRequest } from "next/server";
import { prisma, ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";
import { sendEmail } from "@/lib/outbound";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const draft = await prisma.messageDraft.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: { case: { include: { contact: true } } },
  });
  if (!draft) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (draft.status === "sent") {
    return NextResponse.json({ error: "draft already sent" }, { status: 409 });
  }
  const recipient = draft.case.contact?.email;
  if (!recipient) {
    return NextResponse.json({ error: "case contact has no email" }, { status: 400 });
  }

  const result = await sendEmail({
    to: recipient,
    subject: draft.subject ?? "",
    body: draft.body,
  });

  const outbound = await prisma.$transaction(async (tx) => {
    const out = await tx.outboundMessage.create({
      data: {
        tenantId: tenant.id,
        caseId: draft.caseId,
        channel: "email",
        recipient,
        subject: draft.subject,
        body: draft.body,
        sentAt: result.sentAt,
        externalId: result.externalId,
      },
    });
    await tx.messageDraft.update({
      where: { id: draft.id },
      data: { status: "sent" },
    });
    return out;
  });

  await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.MESSAGE_SENT,
    caseId: draft.caseId,
    payload: {
      draftId: draft.id,
      draftType: draft.draftType,
      outboundId: outbound.id,
      provider: result.provider,
    },
  });

  return NextResponse.json({ ok: true, outboundId: outbound.id });
}
