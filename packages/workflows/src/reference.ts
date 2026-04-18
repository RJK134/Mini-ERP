import { prisma } from "@ops-hub/db";

// Per-tenant monotonic reference like AP-0001.
export async function nextCaseReference(tenantId: string, prefix = "AP"): Promise<string> {
  const count = await prisma.case.count({ where: { tenantId } });
  const n = (count + 1).toString().padStart(4, "0");
  return `${prefix}-${n}`;
}
