"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@ops-hub/ui";

export interface InitialExtraction {
  serviceType: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  locationText: string | null;
  preferredWindow: string | null;
  summary: string;
  missingFields: string[];
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function ApproveForm({
  inboundId,
  initial,
}: {
  inboundId: string;
  initial: InitialExtraction;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState(initial.serviceType ?? "");
  const [priority, setPriority] = useState<string>(initial.priority ?? "MEDIUM");
  const [locationText, setLocationText] = useState(initial.locationText ?? "");
  const [preferredWindow, setPreferredWindow] = useState(initial.preferredWindow ?? "");
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [missing, setMissing] = useState<string>((initial.missingFields ?? []).join(", "));

  async function submit(action: "approve" | "reject") {
    setPending(true);
    setError(null);
    try {
      if (action === "reject") {
        const res = await fetch(`/api/inbound/${inboundId}/reject`, { method: "POST" });
        if (!res.ok) throw new Error((await res.json())?.error ?? "Reject failed");
        router.refresh();
        return;
      }
      const missingFields = missing
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`/api/inbound/${inboundId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceType: serviceType || null,
          priority: priority || null,
          locationText: locationText || null,
          preferredWindow: preferredWindow || null,
          summary,
          missingFields,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Approve failed");
      const { caseId } = (await res.json()) as { caseId: string };
      router.push(`/cases/${caseId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">Review extraction</h2>
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-sm text-slate-600">
          Edit any field before approving. The edits become the authoritative extraction for this case.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LabeledInput label="Service type" value={serviceType} onChange={setServiceType} placeholder="leak_repair" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-500">Priority</span>
            <select
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
            </select>
          </label>
          <LabeledInput label="Location" value={locationText} onChange={setLocationText} placeholder="SW1A 1AA" />
          <LabeledInput label="Preferred window" value={preferredWindow} onChange={setPreferredWindow} placeholder="after 2pm today" />
        </div>

        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-slate-500">Summary</span>
          <textarea
            className="min-h-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>

        <LabeledInput
          label="Missing fields (comma separated)"
          value={missing}
          onChange={setMissing}
          placeholder="address_or_postcode, preferred_window"
        />

        <div className="mt-4 flex gap-2">
          <Button onClick={() => submit("approve")} disabled={pending}>
            {pending ? "Creating…" : "Approve & create case"}
          </Button>
          <Button variant="secondary" onClick={() => submit("reject")} disabled={pending}>
            Reject
          </Button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </CardBody>
    </Card>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="text"
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...(placeholder ? { placeholder } : {})}
      />
    </label>
  );
}
