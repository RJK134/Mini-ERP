import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma, ActivityType, TaskStatus } from "@ops-hub/db";
import { recordEvent } from "@ops-hub/workflows";
import { getCurrentTenant } from "@/lib/tenant";

const Create = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4_000).optional(),
  dueAt: z.string().datetime().optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();

  const c = await prisma.case.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!c) return NextResponse.json({ error: "case not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = Create.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", issues: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      tenantId: tenant.id,
      caseId: c.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: TaskStatus.OPEN,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      assigneeId: parsed.data.assigneeId ?? null,
    },
  });

  await recordEvent({
    tenantId: tenant.id,
    type: ActivityType.TASK_CREATED,
    caseId: c.id,
    payload: { taskId: task.id, title: task.title },
  });

  return NextResponse.json({ ok: true, task });
}
