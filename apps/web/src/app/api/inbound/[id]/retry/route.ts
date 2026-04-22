import { NextResponse, type NextRequest } from "next/server";
import { ActivityType } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";
import { retryInboundItem } from "@/lib/intake";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  try {
    const item = await retryInboundItem(tenant.id, params.id);
    await recordEvent({
      tenantId: tenant.id,
      type: ActivityType.INBOUND_RECEIVED,
      inboundItemId: item.id,
      payload: { retried: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "retry failed" },
      { status: 400 },
    );
  }
}
