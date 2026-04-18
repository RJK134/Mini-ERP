export const EXTRACTION_VERSION = "extract.v1";

export interface ExtractionResult {
  serviceType: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  locationText: string | null;
  preferredWindow: string | null;
  summary: string;
  missingFields: string[];
  confidence: number;
}

export const EXTRACTION_PROMPT = `You are the intake analyst for a specialist service business.

Given the inbound message below, extract a JSON object with the following keys:
- serviceType: a short machine slug for the kind of work requested (e.g. "leak_repair", "boiler_service", "drain_unblock"). null if unclear.
- priority: one of LOW, MEDIUM, HIGH, URGENT. null if unclear.
- locationText: a free-text location or postcode. null if none given.
- preferredWindow: a free-text time window the customer offered. null if none.
- summary: one sentence the dispatcher can read at a glance.
- missingFields: array of strings naming information a human should ask for before scheduling.
- confidence: 0–1 self-estimate of extraction quality.

Rules:
- Never invent contact details.
- If the message is not an operational request, return serviceType=null, priority=null, and explain in summary.
- Output strictly valid JSON. No prose, no code fences.

Inbound message:
---
{{INBOUND_TEXT}}
---`;
