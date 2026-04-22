"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export interface InboxFilterState {
  source: string | null;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export function InboxFilters({
  initial,
  sources,
  statuses,
}: {
  initial: InboxFilterState;
  sources: readonly string[];
  statuses: readonly string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: keyof InboxFilterState, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(`/inbox?${next.toString()}`);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-white p-3">
      <Field label="Source">
        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.source ?? ""}
          onChange={(e) => update("source", e.target.value)}
        >
          <option value="">All</option>
          {sources.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </select>
      </Field>

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

      <Field label="From">
        <input
          type="date"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.dateFrom ?? ""}
          onChange={(e) => update("dateFrom", e.target.value)}
        />
      </Field>

      <Field label="To">
        <input
          type="date"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={initial.dateTo ?? ""}
          onChange={(e) => update("dateTo", e.target.value)}
        />
      </Field>

      {pending && <span className="text-xs text-slate-500">Updating…</span>}
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
