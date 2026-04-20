import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@ops-hub/db";

// Stripe webhook skeleton. Records the minimal state needed to gate plan
// limits without pulling the Stripe SDK yet. Signature verification + the
// SDK call land in phase-5-hardening.
interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

function verify(
  signatureHeader: string | null,
  payload: string,
): "ok" | "not_configured" | "invalid" {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return "not_configured";
  if (!signatureHeader) return "invalid";

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = Number(parts.find((part) => part.startsWith("t="))?.slice(2));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter((signature) => signature.length > 0);

  if (!Number.isFinite(timestamp) || signatures.length === 0) return "invalid";
  if (Math.abs(Date.now() / 1000 - timestamp) > STRIPE_SIGNATURE_TOLERANCE_SECONDS)
    return "invalid";

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const matches = signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, "utf8");
    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  });

  return matches ? "ok" : "invalid";
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const verification = verify(req.headers.get("stripe-signature"), payload);
  if (verification !== "ok") {
    return NextResponse.json(
      { error: verification === "not_configured" ? "stripe not configured" : "invalid signature" },
      { status: verification === "not_configured" ? 501 : 400 },
    );
  }

  const body = (() => {
    try {
      return JSON.parse(payload) as StripeEvent;
    } catch {
      return null;
    }
  })();
  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  const obj = body.data.object;
  const tenantId =
    typeof obj.metadata === "object" && obj.metadata !== null
      ? (obj.metadata as Record<string, unknown>).tenantId
      : undefined;
  if (typeof tenantId !== "string") {
    return NextResponse.json({ ok: true, ignored: "no tenantId" });
  }

  const providerRef = typeof obj.id === "string" ? obj.id : body.id;
  const planCode =
    typeof obj.metadata === "object" && obj.metadata !== null
      ? (((obj.metadata as Record<string, unknown>).planCode as string | undefined) ?? "pilot")
      : "pilot";
  const status = typeof obj.status === "string" ? obj.status : "active";
  const seats = typeof obj.quantity === "number" ? obj.quantity : null;

  switch (body.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await prisma.subscription.upsert({
        where: { id: `sub-${tenantId}-${providerRef}` },
        update: { status, planCode, ...(seats !== null ? { seats } : {}) },
        create: {
          id: `sub-${tenantId}-${providerRef}`,
          tenantId,
          provider: "stripe",
          providerRef,
          planCode,
          status,
          seats,
        },
      });
      break;
    case "customer.subscription.deleted":
      await prisma.subscription.updateMany({
        where: { tenantId, providerRef },
        data: { status: "canceled" },
      });
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
