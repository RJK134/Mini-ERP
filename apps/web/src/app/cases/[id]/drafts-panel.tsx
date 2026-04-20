"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ops-hub/ui";

export interface DraftRow {
  id: string;
  draftType: "ACKNOWLEDGEMENT" | "REQUEST_FOR_INFO" | "CONFIRMATION" | "INTERNAL_SUMMARY";
  subject: string | null;
  body: string;
  status: string;
  createdAt: string;
}

export function DraftsPanel({ drafts }: { drafts: DraftRow[] }) {
  if (drafts.length === 0) {
    return <div className="text-sm text-slate-500">No drafts yet.</div>;
  }
  return (
    <ul className="space-y-4">
      {drafts.map((d) => (
        <DraftItem key={d.id} draft={d} />
      ))}
    </ul>
  );
}

function DraftItem({ draft }: { draft: DraftRow }) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [pending, setPending] = useState<"save" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sent = draft.status === "sent";

  async function persistDraft() {
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
    if (!res.ok) throw new Error((await res.json())?.error ?? "Save failed");
  }

  async function save() {
    setPending("save");
    setError(null);
    try {
      await persistDraft();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  async function send() {
    setPending("send");
    setError(null);
    try {
      await persistDraft();
      const res = await fetch(`/api/drafts/${draft.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Send failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <li className="rounded border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {draft.draftType.replace(/_/g, " ").toLowerCase()}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${sent ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
        >
          {draft.status}
        </span>
      </div>

      <input
        type="text"
        className="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={sent}
      />
      <textarea
        className="min-h-32 w-full rounded border border-slate-300 bg-white px-2 py-1 font-sans text-sm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={sent}
      />

      {!sent && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="secondary" onClick={save} disabled={pending !== null}>
            {pending === "save" ? "Saving…" : "Save draft"}
          </Button>
          <Button size="sm" onClick={send} disabled={pending !== null}>
            {pending === "send" ? "Sending…" : "Send"}
          </Button>
        </div>
      )}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </li>
  );
}
