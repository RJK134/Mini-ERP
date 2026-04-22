import { prisma, ActivityType, InboundSource, InboundStatus, type InboundItem } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";
import { getStorage, storageKeyFor } from "@ops-hub/storage";

export interface IngestAttachment {
  fileName: string;
  mimeType?: string;
  body: Buffer;
}

export interface IngestEmailInput {
  tenantId: string;
  externalId: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string;
  contactId: string | null;
  normalizedText: string;
  rawPayload: object;
  receivedAt?: Date;
  attachments?: IngestAttachment[];
}

export interface IngestFormInput {
  tenantId: string;
  externalId: string;
  subject: string | null;
  fromName: string;
  fromEmail: string;
  fromPhone: string | null;
  contactId: string | null;
  normalizedText: string;
  rawPayload: object;
  attachments?: IngestAttachment[];
}

export interface IngestResult {
  inboundItem: InboundItem;
  reused: boolean;
}

// Idempotent: if an InboundItem already exists for (tenant, source, externalId)
// it is returned unchanged. Attachments and ActivityEvents are only written on
// the create path so retries don't duplicate.
export async function ingestEmail(input: IngestEmailInput): Promise<IngestResult> {
  return ingest({
    ...input,
    source: InboundSource.EMAIL,
    fromPhone: null,
  });
}

export async function ingestForm(input: IngestFormInput): Promise<IngestResult> {
  return ingest({ ...input, source: InboundSource.FORM });
}

async function ingest(input: {
  tenantId: string;
  source: InboundSource;
  externalId: string;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  fromPhone: string | null;
  contactId: string | null;
  normalizedText: string;
  rawPayload: object;
  receivedAt?: Date;
  attachments?: IngestAttachment[];
}): Promise<IngestResult> {
  const existing = await prisma.inboundItem.findUnique({
    where: {
      tenantId_source_externalId: {
        tenantId: input.tenantId,
        source: input.source,
        externalId: input.externalId,
      },
    },
  });
  if (existing) return { inboundItem: existing, reused: true };

  const item = await prisma.inboundItem.create({
    data: {
      tenantId: input.tenantId,
      source: input.source,
      status: InboundStatus.RECEIVED,
      externalId: input.externalId,
      subject: input.subject,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      fromPhone: input.fromPhone,
      receivedAt: input.receivedAt ?? new Date(),
      contactId: input.contactId,
      normalizedText: input.normalizedText,
      rawPayload: input.rawPayload as object,
    },
  });

  if (input.attachments?.length) {
    const storage = getStorage();
    for (const att of input.attachments) {
      const key = storageKeyFor({
        tenantId: input.tenantId,
        inboundItemId: item.id,
        fileName: att.fileName,
      });
      await storage.put({ key, body: att.body, ...(att.mimeType ? { contentType: att.mimeType } : {}) });
      await prisma.inboundAttachment.create({
        data: {
          tenantId: input.tenantId,
          inboundItemId: item.id,
          fileName: att.fileName,
          mimeType: att.mimeType ?? null,
          fileSize: att.body.byteLength,
          storageKey: key,
        },
      });
    }
  }

  await recordEvent({
    tenantId: input.tenantId,
    type: ActivityType.INBOUND_RECEIVED,
    inboundItemId: item.id,
    payload: { source: input.source },
  });

  return { inboundItem: item, reused: false };
}

// Reset a FAILED item back to RECEIVED so the worker picks it up again.
export async function retryInboundItem(tenantId: string, inboundItemId: string) {
  const item = await prisma.inboundItem.findFirst({
    where: { id: inboundItemId, tenantId },
  });
  if (!item) throw new Error("not found");
  if (item.status !== InboundStatus.FAILED) {
    throw new Error(`cannot retry from status ${item.status}`);
  }
  return prisma.inboundItem.update({
    where: { id: item.id },
    data: { status: InboundStatus.RECEIVED },
  });
}
