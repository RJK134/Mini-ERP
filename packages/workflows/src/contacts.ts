import { prisma } from "@ops-hub/db";

export interface UpsertContactInput {
  tenantId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  organization?: string | null;
}

export function splitName(full: string | null | undefined): {
  first: string | null;
  last: string | null;
} {
  const trimmed = full?.trim();
  if (!trimmed) return { first: null, last: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? null, last: null };
  return { first: parts.slice(0, -1).join(" "), last: parts.slice(-1).join(" ") };
}

// Dedupe by tenantId + lowercased email when present, else tenantId + phone.
// Falls back to creating a new contact if neither is given.
export async function upsertContact(input: UpsertContactInput) {
  const tenantId = input.tenantId;
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;

  if (email) {
    const existing = await prisma.contact.findFirst({ where: { tenantId, email } });
    if (existing) {
      return prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: input.firstName ?? existing.firstName,
          lastName: input.lastName ?? existing.lastName,
          phone: phone ?? existing.phone,
          organization: input.organization ?? existing.organization,
        },
      });
    }
  } else if (phone) {
    const existing = await prisma.contact.findFirst({ where: { tenantId, phone } });
    if (existing) return existing;
  }

  return prisma.contact.create({
    data: {
      tenantId,
      email,
      phone,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      organization: input.organization ?? null,
    },
  });
}
