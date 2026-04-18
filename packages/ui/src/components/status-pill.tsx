import * as React from "react";
import { Badge } from "./badge.js";

const CASE_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  NEW: "info",
  TRIAGE: "info",
  AWAITING_INFO: "warning",
  QUALIFIED: "info",
  SCHEDULED: "info",
  ACTIVE: "success",
  COMPLETED: "success",
  CLOSED: "neutral",
};

const INBOUND_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  RECEIVED: "neutral",
  NORMALIZED: "neutral",
  EXTRACTED: "info",
  NEEDS_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  FAILED: "danger",
};

export function StatusPill({
  kind,
  value,
}: {
  kind: "case" | "inbound";
  value: string;
}) {
  const tone =
    kind === "case"
      ? CASE_TONE[value] ?? "neutral"
      : INBOUND_TONE[value] ?? "neutral";
  return <Badge tone={tone}>{value.replace(/_/g, " ").toLowerCase()}</Badge>;
}
