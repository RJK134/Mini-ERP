import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@ops-hub/db";
import { getCurrentTenant } from "@/lib/tenant";

const Patch = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().max(20_000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const draft = await prisma.messageDraft.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!draft) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (draft.status === "sent") {
    return NextResponse.json({ error: "draft already sent" }, { status: 409 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Patch.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid patch", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.messageDraft.update({
    where: { id: draft.id },
    data: {
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
      ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
    },
  });

  return NextResponse.json({ ok: true, draft: updated });
}
