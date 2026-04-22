"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ops-hub/ui";

export interface AssignableUser {
  id: string;
  name: string;
}

export interface AssignableTeam {
  id: string;
  name: string;
}

export function StatusControl({
  caseId,
  current,
  allowed,
}: {
  caseId: string;
  current: string;
  allowed: readonly string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function moveTo(to: string) {
    setError(null);
    const res = await fetch(`/api/cases/${caseId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to }),
    });
    if (!res.ok) {
      setError((await res.json())?.error ?? "transition failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  if (allowed.length === 0) {
    return <span className="text-xs text-slate-500">terminal state — no transitions</span>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {allowed.map((s) => (
          <Button key={s} size="sm" variant="secondary" disabled={pending} onClick={() => moveTo(s)}>
            → {s.replace(/_/g, " ").toLowerCase()}
          </Button>
        ))}
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <div className="mt-1 text-xs text-slate-500">current: {current.toLowerCase()}</div>
    </div>
  );
}

export function AssignControl({
  caseId,
  currentAssigneeId,
  currentTeamId,
  users,
  teams,
}: {
  caseId: string;
  currentAssigneeId: string | null;
  currentTeamId: string | null;
  users: AssignableUser[];
  teams: AssignableTeam[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function save(key: "assigneeId" | "teamId", value: string) {
    setError(null);
    const res = await fetch(`/api/cases/${caseId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [key]: value || null }),
    });
    if (!res.ok) {
      setError((await res.json())?.error ?? "assign failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Assignee</span>
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={currentAssigneeId ?? ""}
          disabled={pending}
          onChange={(e) => save("assigneeId", e.target.value)}
        >
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-500">Team</span>
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={currentTeamId ?? ""}
          disabled={pending}
          onChange={(e) => save("teamId", e.target.value)}
        >
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}

export function NoteForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "save failed");
      setBody("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <textarea
        className="min-h-20 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        placeholder="Add an internal note — visible only to the team."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          {pending ? "Saving…" : "Add note"}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
