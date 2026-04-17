import { NextResponse, type NextRequest } from "next/server";
import { prisma, InboundStatus } from "@ops-hub/db";
import { getCurrentTenant } from "@/lib/tenant";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const item = await prisma.inboundItem.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.inboundItem.update({
    where: { id: item.id },
    data: { status: InboundStatus.REJECTED },
  });

  return NextResponse.json({ ok: true });
}
