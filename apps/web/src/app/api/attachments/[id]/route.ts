import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@ops-hub/db";
import { getStorage } from "@ops-hub/storage";
import { getCurrentTenant } from "@/lib/tenant";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const attachment = await prisma.inboundAttachment.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!attachment) return NextResponse.json({ error: "not found" }, { status: 404 });

  let result;
  try {
    result = await getStorage().get(attachment.storageKey);
  } catch {
    return NextResponse.json({ error: "object missing in storage" }, { status: 410 });
  }

  return new NextResponse(new Uint8Array(result.body), {
    status: 200,
    headers: {
      "content-type": result.contentType ?? attachment.mimeType ?? "application/octet-stream",
      "content-length": String(result.size),
      "content-disposition": `attachment; filename="${attachment.fileName.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
