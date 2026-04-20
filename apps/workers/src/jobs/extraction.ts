import { prisma, InboundStatus, ActivityType, Prisma } from "@ops-hub/db";
import { EXTRACTION_VERSION } from "@ops-hub/prompts";
import { recordEvent } from "@ops-hub/workflows";
import { extract } from "../lib/extractor.js";

export async function processPendingExtractions(): Promise<void> {
  const pending = await prisma.inboundItem.findMany({
    where: {
      status: { in: [InboundStatus.RECEIVED, InboundStatus.NORMALIZED] },
    },
    take: 10,
    orderBy: { receivedAt: "asc" },
  });

  for (const item of pending) {
    try {
      const text = item.normalizedText ?? item.subject ?? "";
      const result = await extract(text);
      await prisma.$transaction(async (tx) => {
        await tx.extractionRun.create({
          data: {
            tenantId: item.tenantId,
            inboundItemId: item.id,
            modelName: process.env.LLM_MODEL ?? "claude-sonnet-4-6",
            promptVersion: EXTRACTION_VERSION,
            status: "completed",
            confidenceScore: result.confidence,
            extractedData: result as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.inboundItem.update({
          where: { id: item.id },
          data: { status: InboundStatus.NEEDS_REVIEW },
        });
      });

      await recordEvent({
        tenantId: item.tenantId,
        type: ActivityType.EXTRACTION_RUN,
        inboundItemId: item.id,
        payload: {
          confidence: result.confidence,
          model: process.env.LLM_MODEL ?? "claude-sonnet-4-6",
          missingFields: result.missingFields,
        },
      });
    } catch (err) {
      console.error("[extraction] failed for", item.id, err);
      await prisma.inboundItem.update({
        where: { id: item.id },
        data: { status: InboundStatus.FAILED },
      });
    }
  }
}
