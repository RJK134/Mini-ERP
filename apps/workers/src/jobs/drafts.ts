import { prisma, DraftType, ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";

// Picks new cases without an ACKNOWLEDGEMENT draft yet and creates one.
export async function processPendingDrafts(): Promise<void> {
  const candidates = await prisma.case.findMany({
    where: {
      drafts: { none: { draftType: DraftType.ACKNOWLEDGEMENT } },
    },
    include: { contact: true, tenant: true },
    take: 10,
  });

  for (const c of candidates) {
    const firstName = c.contact?.firstName ?? "there";
    const tenantName = c.tenant.name;
    const body =
      `Hi ${firstName},\n\n` +
      `Thanks for getting in touch about "${c.title}". ` +
      `We've logged your request (ref ${c.reference}) and someone from our team ` +
      `will follow up within one working day to confirm next steps.\n\n` +
      `Best,\nThe ${tenantName} team`;

    await prisma.messageDraft.create({
      data: {
        tenantId: c.tenantId,
        caseId: c.id,
        draftType: DraftType.ACKNOWLEDGEMENT,
        subject: `Re: ${c.title}`,
        body,
        status: "pending_review",
      },
    });

    await recordEvent({
      tenantId: c.tenantId,
      type: ActivityType.DRAFT_GENERATED,
      caseId: c.id,
      payload: { draftType: DraftType.ACKNOWLEDGEMENT },
    });
  }
}
