"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ops-hub/ui";

export function RetryButton({ inboundId }: { inboundId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function retry() {
    setPending(true);
    try {
      const res = await fetch(`/api/inbound/${inboundId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Retry failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={retry} disabled={pending} variant="secondary" size="sm">
      {pending ? "Retrying…" : "Retry ingestion"}
    </Button>
  );
}
