import { NextResponse, type NextRequest } from "next/server";
import { prisma, InboundStatus, CaseStatus, Priority, ActivityType } from "@ops-hub/db";
import { nextCaseReference, recordEvent, evaluateAssignment, type WorkflowRuleShape } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
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

  const data = (extraction.extractedData ?? {}) as {
    serviceType?: string | null;
    priority?: Priority | null;
    locationText?: string | null;
    summary?: string;
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

  const priority: Priority = (data.priority as Priority) ?? Priority.MEDIUM;
  const assignment = evaluateAssignment(
    { serviceType: data.serviceType ?? null, priority },
    rules,
  );

  const reference = await nextCaseReference(tenant.id);

  const created = await prisma.$transaction(async (tx) => {
    const created = await tx.case.create({
      data: {
        tenantId: tenant.id,
        reference,
        status: CaseStatus.TRIAGE,
        priority,
        title: data.summary ?? item.subject ?? "New case",
        summary: data.summary ?? null,
        serviceType: data.serviceType ?? null,
        locationText: data.locationText ?? null,
        contactId: item.contactId,
        teamId: assignment?.assignTeamId ?? null,
        assigneeId: assignment?.assignUserId ?? null,
      },
    });

    await tx.inboundItem.update({
      where: { id: item.id },
      data: { status: InboundStatus.APPROVED, approvedCaseId: created.id },
    });

    return created;
  });

  await Promise.all([
    recordEvent({
      tenantId: tenant.id,
      type: ActivityType.EXTRACTION_APPROVED,
      inboundItemId: item.id,
      caseId: created.id,
    }),
    recordEvent({
      tenantId: tenant.id,
      type: ActivityType.CASE_CREATED,
      inboundItemId: item.id,
      caseId: created.id,
      payload: { reference },
    }),
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
