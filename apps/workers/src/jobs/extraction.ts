import { prisma, InboundStatus, ActivityType } from "@ops-hub/db";
import { EXTRACTION_PROMPT, EXTRACTION_VERSION, type ExtractionResult } from "@ops-hub/prompts";
import { recordEvent } from "@ops-hub/workflows";

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
      const result = await runExtraction(item.normalizedText ?? item.subject ?? "");
      await prisma.$transaction(async (tx) => {
        await tx.extractionRun.create({
          data: {
            tenantId: item.tenantId,
            inboundItemId: item.id,
            modelName: process.env.LLM_MODEL ?? "claude-sonnet-4-6",
            promptVersion: EXTRACTION_VERSION,
            status: "completed",
            confidenceScore: result.confidence,
            extractedData: result as unknown as object,
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
        payload: { confidence: result.confidence, model: process.env.LLM_MODEL ?? "claude-sonnet-4-6" },
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

// Phase-2 stub. Replace with real LLM call in phase-2-extraction.
// The prompt template lives in @ops-hub/prompts so production + workers share it.
async function runExtraction(text: string): Promise<ExtractionResult> {
  const hasApiKey = Boolean(process.env.LLM_API_KEY);
  if (!hasApiKey) {
    return heuristicExtraction(text);
  }
  // Real provider call would go here. Using heuristic until provider is wired.
  void EXTRACTION_PROMPT;
  return heuristicExtraction(text);
}

function heuristicExtraction(text: string): ExtractionResult {
  const lc = text.toLowerCase();
  const priority =
    /urgent|emergency|flood|burst/.test(lc) ? "URGENT" :
    /asap|today|leak/.test(lc) ? "HIGH" :
    /next week|when convenient/.test(lc) ? "LOW" :
    "MEDIUM";

  const serviceType =
    /leak|tap|drip/.test(lc) ? "leak_repair" :
    /boiler|heating/.test(lc) ? "boiler_service" :
    /drain|block/.test(lc) ? "drain_unblock" :
    null;

  const postcode = /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/i.exec(text)?.[0] ?? null;

  return {
    serviceType,
    priority,
    locationText: postcode,
    preferredWindow: null,
    summary: text.slice(0, 140).replace(/\s+/g, " ").trim(),
    missingFields: postcode ? [] : ["address_or_postcode"],
    confidence: 0.6,
  };
}
