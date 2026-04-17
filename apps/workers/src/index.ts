import { prisma } from "@ops-hub/db";
import { processPendingExtractions } from "./jobs/extraction.js";
import { processPendingDrafts } from "./jobs/drafts.js";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 5000);

async function tick() {
  try {
    await processPendingExtractions();
    await processPendingDrafts();
  } catch (err) {
    console.error("[worker] tick failed", err);
  }
}

async function main() {
  console.log("[worker] starting. interval:", INTERVAL_MS, "ms");
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Poll loop. Swap to BullMQ if throughput demands it (see CLAUDE.md).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

async function shutdown() {
  console.log("[worker] shutting down");
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
