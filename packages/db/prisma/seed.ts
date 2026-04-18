import { PrismaClient, Prisma, UserRole, InboundSource, InboundStatus, CaseStatus, Priority, ActivityType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo tenant…");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "acme-plumbing" },
    update: {},
    create: {
      name: "Acme Plumbing",
      slug: "acme-plumbing",
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "owner@acme-plumbing.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "owner@acme-plumbing.test",
      name: "Jordan Owner",
      role: UserRole.OWNER,
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "reviewer@acme-plumbing.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "reviewer@acme-plumbing.test",
      name: "Riley Reviewer",
      role: UserRole.REVIEWER,
    },
  });

  const operator = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "op@acme-plumbing.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "op@acme-plumbing.test",
      name: "Sam Operator",
      role: UserRole.OPERATOR,
    },
  });

  const team = await prisma.team.upsert({
    where: { id: `${tenant.id}-field` },
    update: {},
    create: {
      id: `${tenant.id}-field`,
      tenantId: tenant.id,
      name: "Field Team",
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: operator.id } },
    update: {},
    create: { tenantId: tenant.id, teamId: team.id, userId: operator.id },
  });

  const contact = await prisma.contact.create({
    data: {
      tenantId: tenant.id,
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      phone: "+44 20 7946 0000",
    },
  });

  const inbound1 = await prisma.inboundItem.create({
    data: {
      tenantId: tenant.id,
      source: InboundSource.EMAIL,
      status: InboundStatus.NEEDS_REVIEW,
      externalId: "seed-email-1",
      subject: "Leaking tap in kitchen — urgent",
      fromName: "Jane Smith",
      fromEmail: "jane.smith@example.com",
      receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      contactId: contact.id,
      normalizedText:
        "Hi, our kitchen mixer tap has been dripping all night and is getting worse. " +
        "We're in SW1A 1AA. Can someone come today? We're around after 2pm.",
      rawPayload: {
        provider: "postmark",
        headers: { "message-id": "seed-email-1" },
        from: "jane.smith@example.com",
        subject: "Leaking tap in kitchen — urgent",
      },
    },
  });

  await prisma.extractionRun.create({
    data: {
      tenantId: tenant.id,
      inboundItemId: inbound1.id,
      modelName: "claude-sonnet-4-6",
      promptVersion: "extract.v1",
      status: "completed",
      confidenceScore: 0.91,
      extractedData: {
        serviceType: "leak_repair",
        priority: "HIGH",
        locationText: "SW1A 1AA",
        preferredWindow: "after 14:00 today",
        summary: "Kitchen mixer tap dripping, worsening; customer available after 2pm.",
      },
      warnings: Prisma.JsonNull,
    },
  });

  const inbound2 = await prisma.inboundItem.create({
    data: {
      tenantId: tenant.id,
      source: InboundSource.FORM,
      status: InboundStatus.APPROVED,
      externalId: "seed-form-1",
      subject: "Boiler service request",
      fromName: "Ben Roberts",
      fromEmail: "ben@example.co.uk",
      receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      normalizedText:
        "Annual boiler service. Vaillant ecoTEC pro 28. Last serviced Jan 2025. Weekday mornings preferred.",
      rawPayload: {
        form: "contact",
        fields: { name: "Ben Roberts", email: "ben@example.co.uk", message: "Annual boiler service…" },
      },
    },
  });

  const case1 = await prisma.case.create({
    data: {
      tenantId: tenant.id,
      reference: "AP-0001",
      status: CaseStatus.QUALIFIED,
      priority: Priority.MEDIUM,
      title: "Annual boiler service — Ben Roberts",
      summary: "Vaillant ecoTEC pro 28, last serviced Jan 2025.",
      serviceType: "boiler_service",
      locationText: "E1 6AN",
      teamId: team.id,
      assigneeId: operator.id,
      qualifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  });

  await prisma.inboundItem.update({
    where: { id: inbound2.id },
    data: { approvedCaseId: case1.id },
  });

  await prisma.task.create({
    data: {
      tenantId: tenant.id,
      caseId: case1.id,
      title: "Confirm visit window with customer",
      status: "OPEN",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      assigneeId: operator.id,
      createdById: reviewer.id,
    },
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: ActivityType.INBOUND_RECEIVED,
        inboundItemId: inbound1.id,
        payload: { source: "EMAIL" },
      },
      {
        tenantId: tenant.id,
        type: ActivityType.EXTRACTION_RUN,
        inboundItemId: inbound1.id,
        payload: { model: "claude-sonnet-4-6", confidence: 0.91 },
      },
      {
        tenantId: tenant.id,
        type: ActivityType.INBOUND_RECEIVED,
        inboundItemId: inbound2.id,
        payload: { source: "FORM" },
      },
      {
        tenantId: tenant.id,
        type: ActivityType.CASE_CREATED,
        inboundItemId: inbound2.id,
        caseId: case1.id,
        actorUserId: reviewer.id,
      },
      {
        tenantId: tenant.id,
        type: ActivityType.ASSIGNED,
        caseId: case1.id,
        actorUserId: owner.id,
        payload: { assigneeId: operator.id },
      },
    ],
  });

  console.log("Seed complete. Tenant:", tenant.slug);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
