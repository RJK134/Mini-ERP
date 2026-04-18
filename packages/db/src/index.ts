import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __opsHubPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__opsHubPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__opsHubPrisma = prisma;
}

export * from "@prisma/client";
export * from "./enums.js";
