"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export interface CasesFilterInitial {
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  teamId: string | null;
  q: string;
  view: string;
}

export function CasesFilters({
  initial,
  users,
  teams,
  statuses,
  priorities,
}: {
  initial: CasesFilterInitial;
  users: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  statuses: readonly string[];
  priorities: readonly string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q);

  function replace(next: URLSearchParams) {
    startTransition(() => router.replace(`/cases?${next.toString()}`));
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    replace(next);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    update("q", q);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-3">
      <Field label="Status">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.status ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">All</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}
        </select>
      </Field>

      <Field label="Priority">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.priority ?? ""}
          onChange={(e) => update("priority", e.target.value)}
        >
          <option value="">All</option>
          {priorities.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
        </select>
      </Field>

      <Field label="Assignee">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.assigneeId ?? ""}
          onChange={(e) => update("assigneeId", e.target.value)}
        >
          <option value="">Anyone</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </Field>

      <Field label="Team">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.teamId ?? ""}
          onChange={(e) => update("teamId", e.target.value)}
        >
          <option value="">Any team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>

      <form onSubmit={submitSearch} className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-slate-500">Search</span>
        <input
          type="search"
          placeholder="ref, title, summary…"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="ml-auto">
        <ViewToggle current={initial.view} onChange={(v) => update("view", v === "list" ? "" : v)} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ViewToggle({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded border border-slate-300 text-sm">
      {(["list", "board"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1 ${current === v ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
