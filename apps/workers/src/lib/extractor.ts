import Anthropic from "@anthropic-ai/sdk";
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_TEMPLATE,
  type ExtractionResult,
  type ExtractionPriority,
} from "@ops-hub/prompts";

const DEFAULT_MODEL = "claude-sonnet-4-6";

let cachedClient: Anthropic | undefined;

function getClient(): Anthropic | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey === "CHANGE_ME") return null;
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

// Extract. Uses Anthropic when LLM_API_KEY is set; falls back to a deterministic
// heuristic so local dev and CI don't need a key.
export async function extract(text: string): Promise<ExtractionResult> {
  const client = getClient();
  if (!client) return heuristicExtraction(text);

  try {
    return await llmExtraction(client, text);
  } catch (err) {
    // Fail open so a flaky provider doesn't block the inbox; worker logs the error.
    console.error("[extractor] LLM call failed, falling back to heuristic:", err);
    return heuristicExtraction(text);
  }
}

async function llmExtraction(client: Anthropic, text: string): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: process.env.LLM_MODEL ?? DEFAULT_MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: EXTRACTION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: EXTRACTION_USER_TEMPLATE.replace("{{INBOUND_TEXT}}", text),
      },
    ],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock) throw new Error("no text block in response");

  const raw = textBlock.text.trim();
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("no JSON object in response");
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as unknown;
  return sanitise(parsed);
}

const PRIORITIES: readonly ExtractionPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function sanitise(raw: unknown): ExtractionResult {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const priority = typeof obj.priority === "string" && (PRIORITIES as readonly string[]).includes(obj.priority)
    ? (obj.priority as ExtractionPriority)
    : null;
  const missing = Array.isArray(obj.missingFields)
    ? obj.missingFields.filter((x): x is string => typeof x === "string")
    : [];
  const confidence = typeof obj.confidence === "number"
    ? Math.min(1, Math.max(0, obj.confidence))
    : 0.5;
  return {
    serviceType: typeof obj.serviceType === "string" ? obj.serviceType : null,
    priority,
    locationText: typeof obj.locationText === "string" ? obj.locationText : null,
    preferredWindow: typeof obj.preferredWindow === "string" ? obj.preferredWindow : null,
    summary: typeof obj.summary === "string" ? obj.summary : "",
    missingFields: missing,
    confidence,
  };
}

export function heuristicExtraction(text: string): ExtractionResult {
  const lc = text.toLowerCase();
  const priority: ExtractionPriority =
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

  const missingFields: string[] = [];
  if (!postcode) missingFields.push("address_or_postcode");
  if (!/\b\d{2}[:.]?\d{2}\b|morning|afternoon|evening|today|tomorrow|monday|tuesday|wednesday|thursday|friday/i.test(lc)) {
    missingFields.push("preferred_window");
  }

  return {
    serviceType,
    priority,
    locationText: postcode,
    preferredWindow: null,
    summary: text.slice(0, 140).replace(/\s+/g, " ").trim(),
    missingFields,
    confidence: 0.6,
  };
}
