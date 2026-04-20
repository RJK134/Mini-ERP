import { prisma, UserRole } from "@ops-hub/db";

// Phase-5 skeleton. Production will resolve the current user from the auth
// session (Clerk/Auth.js). Today it reads the tenant-scoped "reviewer" user
// or whichever role matches the header X-OpsHub-As for local testing.

export interface AuthContext {
  userId: string;
  name: string;
  role: UserRole;
}

const HEADER_AS = "x-opshub-as";

export async function getAuthContext(
  tenantId: string,
  headers?: Headers,
): Promise<AuthContext | null> {
  const requested = headers?.get(HEADER_AS)?.toLowerCase();
  const where =
    requested && Object.values(UserRole).includes(requested.toUpperCase() as UserRole)
      ? { tenantId, role: requested.toUpperCase() as UserRole, isActive: true }
      : { tenantId, role: UserRole.REVIEWER, isActive: true };
  const user = await prisma.user.findFirst({ where });
  if (!user) return null;
  return { userId: user.id, name: user.name, role: user.role };
}

export function hasRole(ctx: AuthContext, allowed: readonly UserRole[]): boolean {
  return allowed.includes(ctx.role);
}

export const ROLES = {
  MANAGES_WORKFLOWS: [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER] as const,
  REVIEWS_INBOUND: [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REVIEWER] as const,
  WORKS_CASES: [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.REVIEWER,
  ] as const,
} as const;
