"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ops-hub/ui";

// Quick scheduling handoff. The real calendar round-trip (Google/O365) is
// deliberately deferred — this moves the case to SCHEDULED and auto-drafts
// a confirmation email, which is what pilot operators actually need on day 1.
export function ScheduleForm({
  caseId,
  defaultWindow,
}: {
  caseId: string;
  defaultWindow?: string | null;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [window, setWindow] = useState(defaultWindow ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!date) return setError("pick a date");
    setPending(true);
    setError(null);
    try {
      const iso = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch(`/api/cases/${caseId}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduledAt: iso,
          ...(window ? { window } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "schedule failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="date"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <input
        type="text"
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        placeholder="Window for the customer (e.g. 9–11am)"
        value={window}
        onChange={(e) => setWindow(e.target.value)}
      />
      <Button size="sm" onClick={submit} disabled={pending}>
        {pending ? "Scheduling…" : "Schedule & draft confirmation"}
      </Button>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
