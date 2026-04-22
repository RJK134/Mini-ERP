import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@ops-hub/db";
import { upsertContact } from "@ops-hub/workflows";
import { ingestForm, type IngestAttachment } from "@/lib/intake";

const FormFields = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(1).max(10_000),
});

const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function externalId(): string {
  return `form-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitName(full: string): { first: string | null; last: string | null } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? null, last: null };
  return { first: parts.slice(0, -1).join(" "), last: parts.slice(-1).join(" ") };
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let fields: z.infer<typeof FormFields>;
  let attachments: IngestAttachment[] = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      const raw: Record<string, unknown> = {};
      let total = 0;
      for (const [key, value] of fd.entries()) {
        if (value instanceof File) {
          const buf = Buffer.from(await value.arrayBuffer());
          total += buf.byteLength;
          if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
            return NextResponse.json({ error: "attachments exceed 25MB limit" }, { status: 413 });
          }
          attachments.push({
            fileName: value.name,
            ...(value.type ? { mimeType: value.type } : {}),
            body: buf,
          });
        } else {
          raw[key] = value;
        }
      }
      const parsed = FormFields.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }
      fields = parsed.data;
    } else {
      const body = await req.json().catch(() => null);
      const parsed = FormFields.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "invalid payload", issues: parsed.error.flatten() }, { status: 400 });
      }
      fields = parsed.data;
    }
  } catch {
    return NextResponse.json({ error: "could not parse request body" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: fields.tenantSlug } });
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 404 });

  const { first, last } = splitName(fields.name);
  const contact = await upsertContact({
    tenantId: tenant.id,
    email: fields.email,
    phone: fields.phone ?? null,
    firstName: first,
    lastName: last,
  });

  const { inboundItem, reused } = await ingestForm({
    tenantId: tenant.id,
    externalId: externalId(),
    subject: fields.subject ?? null,
    fromName: fields.name,
    fromEmail: fields.email,
    fromPhone: fields.phone ?? null,
    contactId: contact.id,
    normalizedText: fields.message,
    rawPayload: { fields, hasAttachments: attachments.length > 0 } as object,
    attachments,
  });

  return NextResponse.json({ ok: true, inboundItemId: inboundItem.id, reused });
}
