import type { Role } from "@/lib/roles";

export type AIConfigurationContext = "tenant" | "platform";

export function canManageTenantAI(role: Role | string | null | undefined) {
  return role === "tenant_owner" || role === "tenant_admin";
}

export function canManagePlatformAI(role: string | null | undefined) {
  return role === "platform_owner" || role === "platform_admin";
}

export function tenantRequestMatchesCurrentWorkspace(currentTenantId: string, requestedTenantId?: string) {
  return !requestedTenantId || requestedTenantId === currentTenantId;
}
