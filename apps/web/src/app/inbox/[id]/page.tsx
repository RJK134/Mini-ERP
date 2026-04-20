import { notFound } from "next/navigation";
import { prisma, InboundStatus } from "@ops-hub/db";
import { Card, CardBody, CardHeader, StatusPill } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { ApproveForm, type InitialExtraction } from "./approve-form";
import { RetryButton } from "./retry-button";

export const dynamic = "force-dynamic";

function extractionToInitial(data: unknown): InitialExtraction {
  const obj = (data ?? {}) as Record<string, unknown>;
  const priority = typeof obj.priority === "string"
    && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(obj.priority)
    ? (obj.priority as InitialExtraction["priority"])
    : null;
  const missing = Array.isArray(obj.missingFields)
    ? obj.missingFields.filter((x): x is string => typeof x === "string")
    : [];
  return {
    serviceType: typeof obj.serviceType === "string" ? obj.serviceType : null,
    priority,
    locationText: typeof obj.locationText === "string" ? obj.locationText : null,
    preferredWindow: typeof obj.preferredWindow === "string" ? obj.preferredWindow : null,
    summary: typeof obj.summary === "string" ? obj.summary : "",
    missingFields: missing,
  };
}

function bytes(n: number | null | undefined): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function InboundDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const item = await prisma.inboundItem.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      contact: true,
      attachments: { orderBy: { createdAt: "asc" } },
      extractionRuns: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!item) notFound();

  const latestExtraction = item.extractionRuns[0];

  return (
    <div className="mx-auto max-w-4xl p-8">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-wide text-slate-500">Inbound</div>
        <h1 className="mt-1 text-2xl font-semibold">{item.subject ?? "(no subject)"}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusPill kind="inbound" value={item.source} />
          <StatusPill kind="inbound" value={item.status} />
          <span className="text-xs text-slate-500">
            {item.receivedAt.toISOString().replace("T", " ").slice(0, 16)}
          </span>
        </div>
      </header>

      {item.status === InboundStatus.FAILED && (
        <div className="mb-6">
          <Card className="border-red-200 bg-red-50">
            <CardBody className="flex items-center justify-between">
              <div className="text-sm text-red-800">
                Ingestion failed. Reset to <span className="font-mono">RECEIVED</span> to let the worker retry.
              </div>
              <RetryButton inboundId={item.id} />
            </CardBody>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader><h2 className="text-sm font-medium">Message</h2></CardHeader>
          <CardBody>
            <div className="mb-2 text-sm">
              <span className="text-slate-500">From: </span>
              <span>{item.fromName ?? ""} &lt;{item.fromEmail ?? "?"}&gt;</span>
            </div>
            <pre className="whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-800">
              {item.normalizedText ?? "(no normalized text)"}
            </pre>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-sm font-medium">Extraction</h2></CardHeader>
          <CardBody>
            {latestExtraction ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-500">Model:</span> {latestExtraction.modelName}
                </div>
                <div>
                  <span className="text-slate-500">Confidence:</span>{" "}
                  {latestExtraction.confidenceScore !== null
                    ? Math.round(latestExtraction.confidenceScore * 100) + "%"
                    : "—"}
                </div>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-800">
                  {JSON.stringify(latestExtraction.extractedData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No extraction yet.</div>
            )}
          </CardBody>
        </Card>
      </div>

      {item.attachments.length > 0 && (
        <Card className="mt-4">
          <CardHeader><h2 className="text-sm font-medium">Attachments ({item.attachments.length})</h2></CardHeader>
          <CardBody>
            <ul className="divide-y divide-slate-100 text-sm">
              {item.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div>
                    <a
                      href={`/api/attachments/${a.id}`}
                      className="text-slate-900 hover:underline"
                    >
                      {a.fileName}
                    </a>
                    <div className="text-xs text-slate-500">
                      {a.mimeType ?? "application/octet-stream"} · {bytes(a.fileSize)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-slate-600">Raw payload</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(item.rawPayload, null, 2)}
        </pre>
      </details>

      {item.status !== InboundStatus.APPROVED &&
        item.status !== InboundStatus.REJECTED &&
        item.status !== InboundStatus.FAILED &&
        latestExtraction && (
          <div className="mt-6">
            <ApproveForm
              inboundId={item.id}
              initial={extractionToInitial(latestExtraction.extractedData)}
            />
          </div>
        )}
    </div>
  );
}
