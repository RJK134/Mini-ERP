import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, InboundSource, InboundStatus, ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";

// Generic inbound-email webhook receiver. Accepts a Postmark-ish payload and
// normalises it into an InboundItem. Resolves tenant by the recipient address
// e.g. inbound+<tenantSlug>@...
const PostmarkLike = z.object({
  MessageID: z.string(),
  From: z.string(),
  FromName: z.string().optional(),
  To: z.string().optional(),
  ToFull: z.array(z.object({ Email: z.string() })).optional(),
  Subject: z.string().optional(),
  TextBody: z.string().optional(),
  HtmlBody: z.string().optional(),
  Attachments: z
    .array(
      z.object({
        Name: z.string(),
        ContentType: z.string().optional(),
        ContentLength: z.number().optional(),
      }),
    )
    .optional(),
});

function authenticate(req: NextRequest): boolean {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) return true;
  const provided = req.headers.get("x-ops-hub-secret");
  return provided === secret;
}

function resolveTenantSlug(to: string | undefined): string | null {
  if (!to) return null;
  const match = /inbound\+([a-z0-9-]+)@/i.exec(to);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PostmarkLike.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const to = parsed.data.To ?? parsed.data.ToFull?.[0]?.Email ?? "";
  const slug = resolveTenantSlug(to);
  if (!slug) {
    return NextResponse.json({ error: "tenant not resolvable from recipient" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    return NextResponse.json({ error: "unknown tenant" }, { status: 404 });
  }

  const email = parsed.data.From.trim().toLowerCase();
  const contact = await prisma.contact.upsert({
    where: {
      // No @@unique on (tenantId, email) in schema; fall back to findFirst pattern.
      id: `contact-${tenant.id}-${email}`,
    },
    update: {},
    create: {
      id: `contact-${tenant.id}-${email}`,
      tenantId: tenant.id,
      email,
      firstName: parsed.data.FromName?.split(" ").slice(0, -1).join(" ") ?? null,
      lastName: parsed.data.FromName?.split(" ").slice(-1).join(" ") ?? null,
    },
  });

  const item = await prisma.inboundItem.upsert({
    where: {
      tenantId_source_externalId: {
        tenantId: tenant.id,
        source: InboundSource.EMAIL,
        externalId: parsed.data.MessageID,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      source: InboundSource.EMAIL,
      status: InboundStatus.RECEIVED,
      externalId: parsed.data.MessageID,
      subject: parsed.data.Subject ?? null,
      fromName: parsed.data.FromName ?? null,
      fromEmail: email,
      receivedAt: new Date(),
      contactId: contact.id,
      normalizedText: (parsed.data.TextBody ?? parsed.data.HtmlBody ?? "").trim(),
      rawPayload: parsed.data as unknown as object,
    },
  });

  await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.INBOUND_RECEIVED,
    inboundItemId: item.id,
    payload: { source: "EMAIL" },
  });

  // TODO phase-2-extraction: enqueue extraction job here.
  return NextResponse.json({ ok: true, inboundItemId: item.id });
}
