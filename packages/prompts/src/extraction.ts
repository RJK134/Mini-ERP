export const EXTRACTION_VERSION = "extract.v2";

export type ExtractionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ExtractionResult {
  serviceType: string | null;
  priority: ExtractionPriority | null;
  locationText: string | null;
  preferredWindow: string | null;
  summary: string;
  missingFields: string[];
  confidence: number;
}

export const EXTRACTION_SYSTEM_PROMPT = `You are the intake analyst for a specialist service business.

For every inbound message, output a single JSON object with keys:
- serviceType: short machine slug for the kind of work (e.g. "leak_repair", "boiler_service", "drain_unblock"). null if unclear.
- priority: one of "LOW", "MEDIUM", "HIGH", "URGENT". null if unclear.
- locationText: free-text location or postcode. null if none given.
- preferredWindow: free-text time window the customer offered. null if none.
- summary: ONE sentence a dispatcher can read at a glance.
- missingFields: array of strings naming information a human should ask for before scheduling. Use short slugs like "address_or_postcode", "preferred_window", "phone".
- confidence: number 0..1 self-estimate.

Rules:
- Never invent contact details.
- If the message is NOT an operational request (spam, out-of-office, etc.), set serviceType=null, priority=null, and explain in summary.
- Output STRICT JSON. No code fences. No prose. No trailing comments.`;

export const EXTRACTION_USER_TEMPLATE = `Inbound message:
---
{{INBOUND_TEXT}}
---`;

// Legacy single-prompt template kept for tooling that doesn't do chat.
export const EXTRACTION_PROMPT = `${EXTRACTION_SYSTEM_PROMPT}

${EXTRACTION_USER_TEMPLATE}`;
