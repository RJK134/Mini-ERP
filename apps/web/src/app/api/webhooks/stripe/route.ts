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

function verify(_req: NextRequest): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return !!secret && secret !== "";
}

export async function POST(req: NextRequest) {
  if (!verify(req)) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 501 });
  }

  const body = (await req.json().catch(() => null)) as StripeEvent | null;
  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "invalid event" }, { status: 400 });
  }

  const obj = body.data.object;
  const tenantId = typeof obj.metadata === "object" && obj.metadata !== null
    ? (obj.metadata as Record<string, unknown>).tenantId
    : undefined;
  if (typeof tenantId !== "string") {
    return NextResponse.json({ ok: true, ignored: "no tenantId" });
  }

  const providerRef = typeof obj.id === "string" ? obj.id : body.id;
  const planCode = typeof obj.metadata === "object" && obj.metadata !== null
    ? ((obj.metadata as Record<string, unknown>).planCode as string | undefined) ?? "pilot"
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
