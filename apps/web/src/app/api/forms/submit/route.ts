import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, InboundSource, InboundStatus, ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";

const FormSchema = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(10_000),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = FormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: parsed.data.tenantSlug } });
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const externalId = `form-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item = await prisma.inboundItem.create({
    data: {
      tenantId: tenant.id,
      source: InboundSource.FORM,
      status: InboundStatus.RECEIVED,
      externalId,
      subject: parsed.data.subject ?? null,
      fromName: parsed.data.name,
      fromEmail: parsed.data.email,
      fromPhone: parsed.data.phone ?? null,
      receivedAt: new Date(),
      normalizedText: parsed.data.message,
      rawPayload: parsed.data as unknown as object,
    },
  });

  await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.INBOUND_RECEIVED,
    inboundItemId: item.id,
    payload: { source: "FORM" },
  });

  return NextResponse.json({ ok: true, inboundItemId: item.id });
}
