import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, TaskStatus } from "@ops-hub/db";
import { getCurrentTenant } from "@/lib/tenant";

const Patch = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4_000).nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const task = await prisma.task.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Patch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid patch", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.dueAt !== undefined
        ? { dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null }
        : {}),
      ...(parsed.data.assigneeId !== undefined ? { assigneeId: parsed.data.assigneeId } : {}),
    },
  });

  return NextResponse.json({ ok: true, task: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const task = await prisma.task.findFirst({ where: { id: params.id, tenantId: tenant.id } });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  await prisma.task.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
