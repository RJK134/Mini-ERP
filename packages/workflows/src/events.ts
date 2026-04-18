import { prisma, Prisma, ActivityType } from "@ops-hub/db";

export interface RecordEventInput {
  tenantId: string;
  type: ActivityType;
  actorUserId?: string | null;
  inboundItemId?: string | null;
  caseId?: string | null;
  payload?: Prisma.InputJsonValue;
}

export async function recordEvent(input: RecordEventInput) {
  return prisma.activityEvent.create({
    data: {
      tenantId: input.tenantId,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      inboundItemId: input.inboundItemId ?? null,
      caseId: input.caseId ?? null,
      payload: input.payload ?? Prisma.JsonNull,
    },
  });
}
