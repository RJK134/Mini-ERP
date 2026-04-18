"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader } from "@ops-hub/ui";

export function ApproveForm({ inboundId }: { inboundId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/inbound/${inboundId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Failed");
      const { caseId } = (await res.json()) as { caseId: string };
      router.push(`/cases/${caseId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPending(false);
    }
  }

  async function reject() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/inbound/${inboundId}/reject`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">Reviewer actions</h2>
      </CardHeader>
      <CardBody>
        <p className="mb-3 text-sm text-slate-600">
          Approve to create a Case from the extracted fields. Reject if the item is not an operational request.
        </p>
        <div className="flex gap-2">
          <Button onClick={approve} disabled={pending}>Approve &amp; create case</Button>
          <Button variant="secondary" onClick={reject} disabled={pending}>Reject</Button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </CardBody>
    </Card>
  );
}
