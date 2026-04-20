// Outbound email sender. In dev/CI, logs to stdout. In production, swap the
// stub body for the real Postmark call (arrives in phase-4-gtm alongside
// delivery/bounce webhooks).

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  provider: string;
  externalId: string | null;
  sentAt: Date;
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const provider = process.env.OUTBOUND_PROVIDER ?? "stub";
  if (provider === "stub" || !process.env.OUTBOUND_API_KEY || process.env.OUTBOUND_API_KEY === "CHANGE_ME") {
    console.log(`[outbound stub] → ${input.to}: ${input.subject}`);
    return { provider: "stub", externalId: null, sentAt: new Date() };
  }
  // TODO phase-4-gtm: real Postmark / SendGrid call.
  console.warn(`[outbound] provider=${provider} not implemented, falling back to stub`);
  return { provider: "stub", externalId: null, sentAt: new Date() };
}
