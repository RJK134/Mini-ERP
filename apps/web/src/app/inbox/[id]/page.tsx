import { notFound } from "next/navigation";
import { prisma } from "@ops-hub/db";
import { Card, CardBody, CardHeader, StatusPill } from "@ops-hub/ui";
import { getCurrentTenant } from "@/lib/tenant";
import { ApproveForm } from "./approve-form";

export const dynamic = "force-dynamic";

export default async function InboundDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getCurrentTenant();
  const item = await prisma.inboundItem.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      contact: true,
      attachments: true,
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

      {item.status !== "APPROVED" && item.status !== "REJECTED" && latestExtraction && (
        <div className="mt-6">
          <ApproveForm inboundId={item.id} />
        </div>
      )}
    </div>
  );
}
