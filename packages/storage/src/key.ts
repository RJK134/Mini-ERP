import { randomBytes } from "node:crypto";

// Storage key format: <tenantId>/<inboundItemId>/<rand>-<safeFileName>
// Keep it human-skimmable; the random prefix guards against collisions.
export function storageKeyFor(input: {
  tenantId: string;
  inboundItemId: string;
  fileName: string;
}): string {
  const safe = input.fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 120) || "file";
  const rand = randomBytes(4).toString("hex");
  return `${input.tenantId}/${input.inboundItemId}/${rand}-${safe}`;
}
