import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@ops-hub/db";
import { splitName, upsertContact } from "@ops-hub/workflows";
import { ingestEmail, type IngestAttachment } from "@/lib/intake";

// Postmark inbound shape (also covers SendGrid Parse closely enough for v1).
const PostmarkAttachment = z.object({
  Name: z.string(),
  ContentType: z.string().optional(),
  ContentLength: z.number().optional(),
  Content: z.string().optional(), // base64
});

const PostmarkLike = z.object({
  MessageID: z.string(),
  From: z.string(),
  FromName: z.string().optional(),
  To: z.string().optional(),
  ToFull: z.array(z.object({ Email: z.string() })).optional(),
  Subject: z.string().optional(),
  TextBody: z.string().optional(),
  HtmlBody: z.string().optional(),
  Attachments: z.array(PostmarkAttachment).optional(),
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
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const to = parsed.data.To ?? parsed.data.ToFull?.[0]?.Email ?? "";
  const slug = resolveTenantSlug(to);
  if (!slug) {
    return NextResponse.json({ error: "tenant not resolvable from recipient" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const fromEmail = parsed.data.From.trim().toLowerCase();
  const { first, last } = splitName(parsed.data.FromName);

  const contact = await upsertContact({
    tenantId: tenant.id,
    email: fromEmail,
    firstName: first,
    lastName: last,
  });

  const attachments: IngestAttachment[] = (parsed.data.Attachments ?? [])
    .filter((a): a is z.infer<typeof PostmarkAttachment> & { Content: string } =>
      Boolean(a.Content),
    )
    .map((a) => ({
      fileName: a.Name,
      ...(a.ContentType ? { mimeType: a.ContentType } : {}),
      body: Buffer.from(a.Content, "base64"),
    }));

  const { inboundItem, reused } = await ingestEmail({
    tenantId: tenant.id,
    externalId: parsed.data.MessageID,
    subject: parsed.data.Subject ?? null,
    fromName: parsed.data.FromName ?? null,
    fromEmail,
    contactId: contact.id,
    normalizedText: (parsed.data.TextBody ?? parsed.data.HtmlBody ?? "").trim(),
    rawPayload: parsed.data as unknown as object,
    attachments,
  });

  return NextResponse.json({ ok: true, inboundItemId: inboundItem.id, reused });
}
