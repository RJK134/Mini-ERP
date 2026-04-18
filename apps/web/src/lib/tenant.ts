import { prisma } from "@ops-hub/db";

// Phase 1: single demo tenant resolved by slug. Replace with real auth-scoped
// tenant lookup once Clerk/Auth.js lands.
const DEMO_TENANT_SLUG = process.env.DEMO_TENANT_SLUG ?? "acme-plumbing";

export async function getCurrentTenant() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DEMO_TENANT_SLUG } });
  if (!tenant) {
    throw new Error(
      `Demo tenant "${DEMO_TENANT_SLUG}" not found. Run \`pnpm db:seed\`.`,
    );
  }
  return tenant;
}
