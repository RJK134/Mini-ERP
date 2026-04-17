import { prisma, ActivityType } from "@ops-hub/db";

export interface RecordEventInput {
  tenantId: string;
  type: ActivityType;
  actorUserId?: string | null;
  inboundItemId?: string | null;
  caseId?: string | null;
  payload?: unknown;
}

export async function recordEvent(input: RecordEventInput) {
  return prisma.activityEvent.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      inboundItemId: input.inboundItemId ?? null,
      caseId: input.caseId ?? null,
      payload: (input.payload as object | null | undefined) ?? undefined,
    },
  });
}
