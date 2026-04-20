"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ops-hub/ui";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
  dueAt: string | null;
  assigneeName: string | null;
}

const NEXT_STATUS: Record<TaskRow["status"], TaskRow["status"] | null> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  BLOCKED: "IN_PROGRESS",
  DONE: null,
  CANCELED: null,
};

export function TasksPanel({ caseId, tasks }: { caseId: string; tasks: TaskRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          ...(due ? { dueAt: new Date(due).toISOString() } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "create failed");
      setTitle("");
      setDue("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input
          type="text"
          placeholder="New task title"
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <Button size="sm" disabled={creating || !title.trim()} onClick={create}>
          {creating ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

      {tasks.length === 0 ? (
        <div className="text-sm text-slate-500">No tasks yet.</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => <TaskItem key={t.id} task={t} />)}
        </ul>
      )}
    </div>
  );
}

function TaskItem({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const overdue =
    task.dueAt &&
    new Date(task.dueAt) < new Date() &&
    task.status !== "DONE" &&
    task.status !== "CANCELED";
  const next = NEXT_STATUS[task.status];

  async function advance() {
    if (!next) return;
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
      <div>
        <div className="text-sm">{task.title}</div>
        <div className="text-xs text-slate-500">
          {task.dueAt && (
            <span className={overdue ? "text-red-600" : ""}>
              due {task.dueAt.slice(0, 10)}
              {overdue && " (overdue)"}
            </span>
          )}
          {task.assigneeName && <span> · {task.assigneeName}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
          {task.status.replace(/_/g, " ").toLowerCase()}
        </span>
        {next && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={advance}>
            → {next.replace(/_/g, " ").toLowerCase()}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
          ✕
        </Button>
      </div>
    </li>
  );
}
