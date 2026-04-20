import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  prisma,
  InboundStatus,
  CaseStatus,
  Priority,
  ActivityType,
  DraftType,
  Prisma,
} from "@ops-hub/db";
import {
  nextCaseReference,
  recordEvent,
  evaluateAssignment,
  type WorkflowRuleShape,
} from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

const EditedExtraction = z.object({
  serviceType: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable().optional(),
  locationText: z.string().nullable().optional(),
  preferredWindow: z.string().nullable().optional(),
  summary: z.string().optional(),
  missingFields: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const item = await prisma.inboundItem.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: { extractionRuns: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const extraction = item.extractionRuns[0];
  if (!extraction) {
    return NextResponse.json({ error: "no extraction to approve" }, { status: 400 });
  }

  const bodyJson = await req.json().catch(() => ({}));
  const edits = EditedExtraction.safeParse(bodyJson ?? {});
  if (!edits.success) {
    return NextResponse.json({ error: "invalid edits", issues: edits.error.flatten() }, { status: 400 });
  }

  const base = (extraction.extractedData ?? {}) as {
    serviceType?: string | null;
    priority?: Priority | null;
    locationText?: string | null;
    preferredWindow?: string | null;
    summary?: string;
    missingFields?: string[];
  };

  const merged = {
    serviceType: edits.data.serviceType ?? base.serviceType ?? null,
    priority: (edits.data.priority ?? base.priority ?? Priority.MEDIUM) as Priority,
    locationText: edits.data.locationText ?? base.locationText ?? null,
    preferredWindow: edits.data.preferredWindow ?? base.preferredWindow ?? null,
    summary: edits.data.summary ?? base.summary ?? "",
    missingFields: edits.data.missingFields ?? base.missingFields ?? [],
  };

  const rulesRaw = await prisma.workflowRule.findMany({
    where: { tenantId: tenant.id, isActive: true },
  });
  const rules = rulesRaw.map((r): WorkflowRuleShape => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    triggerType: r.triggerType as WorkflowRuleShape["triggerType"],
    conditions: r.conditions as WorkflowRuleShape["conditions"],
    actions: r.actions as WorkflowRuleShape["actions"],
  }));

  const assignment = evaluateAssignment(
    { serviceType: merged.serviceType, priority: merged.priority },
    rules,
  );

  const reference = await nextCaseReference(tenant.id);

  const created = await prisma.$transaction(async (tx) => {
    const created = await tx.case.create({
      data: {
        tenantId: tenant.id,
        reference,
        status: merged.missingFields.length > 0 ? CaseStatus.AWAITING_INFO : CaseStatus.TRIAGE,
        priority: merged.priority,
        title: merged.summary || item.subject || "New case",
        summary: merged.summary || null,
        serviceType: merged.serviceType ?? null,
        locationText: merged.locationText ?? null,
        contactId: item.contactId,
        teamId: assignment?.assignTeamId ?? null,
        assigneeId: assignment?.assignUserId ?? null,
      },
    });

    await tx.inboundItem.update({
      where: { id: item.id },
      data: { status: InboundStatus.APPROVED, approvedCaseId: created.id },
    });

    // Record the reviewer's final extraction as a new ExtractionRun so the
    // audit trail shows what the reviewer actually approved, not just what
    // the AI proposed.
    await tx.extractionRun.create({
      data: {
        tenantId: tenant.id,
        inboundItemId: item.id,
        modelName: "human-review",
        promptVersion: extraction.promptVersion,
        status: "approved",
        confidenceScore: 1,
        extractedData: merged as unknown as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  // Acknowledgement draft (always).
  const contact = item.contactId
    ? await prisma.contact.findUnique({ where: { id: item.contactId } })
    : null;
  const firstName = contact?.firstName ?? "there";
  const ackBody =
    `Hi ${firstName},\n\n` +
    `Thanks for getting in touch about "${created.title}". ` +
    `We've logged your request (ref ${created.reference}) and someone from our team ` +
    `will follow up within one working day to confirm next steps.\n\n` +
    `Best,\nThe ${tenant.name} team`;

  const ack = await prisma.messageDraft.create({
    data: {
      tenantId: tenant.id,
      caseId: created.id,
      draftType: DraftType.ACKNOWLEDGEMENT,
      subject: `Re: ${created.title}`,
      body: ackBody,
      status: "pending_review",
    },
  });

  // Request-for-info draft if the reviewer flagged missing fields.
  let rfi: { id: string } | null = null;
  if (merged.missingFields.length > 0) {
    const bullets = merged.missingFields.map((f) => `  • ${f.replace(/_/g, " ")}`).join("\n");
    const rfiBody =
      `Hi ${firstName},\n\n` +
      `Thanks for your enquiry. Before we can schedule a visit, could you share:\n\n` +
      `${bullets}\n\n` +
      `A quick reply with those details will help us get someone booked in.\n\n` +
      `Best,\nThe ${tenant.name} team`;
    rfi = await prisma.messageDraft.create({
      data: {
        tenantId: tenant.id,
        caseId: created.id,
        draftType: DraftType.REQUEST_FOR_INFO,
        subject: `Re: ${created.title} — a few more details`,
        body: rfiBody,
        status: "pending_review",
      },
    });
  }

  await Promise.all([
    recordEvent({
      tenantId: tenant.id,
      type: ActivityType.EXTRACTION_APPROVED,
      inboundItemId: item.id,
      caseId: created.id,
      payload: { edited: JSON.stringify(edits.data) !== "{}" },
    }),
    recordEvent({
      tenantId: tenant.id,
      type: ActivityType.CASE_CREATED,
      inboundItemId: item.id,
      caseId: created.id,
      payload: { reference },
    }),
    recordEvent({
      tenantId: tenant.id,
      type: ActivityType.DRAFT_GENERATED,
      caseId: created.id,
      payload: { draftType: DraftType.ACKNOWLEDGEMENT, draftId: ack.id },
    }),
    rfi
      ? recordEvent({
          tenantId: tenant.id,
          type: ActivityType.DRAFT_GENERATED,
          caseId: created.id,
          payload: { draftType: DraftType.REQUEST_FOR_INFO, draftId: rfi.id },
        })
      : Promise.resolve(),
    assignment?.assignUserId
      ? recordEvent({
          tenantId: tenant.id,
          type: ActivityType.ASSIGNED,
          caseId: created.id,
          payload: { assigneeId: assignment.assignUserId },
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true, caseId: created.id });
}
