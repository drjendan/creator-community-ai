import type { Role } from "@/lib/mock/podcastos";

const tenantManagers = new Set<Role>([
  "tenant_owner",
  "tenant_admin",
  "content_manager",
  "community_moderator"
]);

export function isPlatformAdmin(role: Role) {
  return role === "platform_owner" || role === "platform_admin";
}

export function canManageTenant(role: Role) {
  return tenantManagers.has(role) || isPlatformAdmin(role);
}

export function canManageContent(role: Role) {
  return ["tenant_owner", "tenant_admin", "content_manager"].includes(role) || isPlatformAdmin(role);
}

export function canAccessPaidContent(input: {
  role: Role;
  membershipStatus?: "active" | "trialing" | "past_due" | "canceled";
  planAccess?: "public" | "member" | "paid";
}) {
  if (isPlatformAdmin(input.role) || canManageTenant(input.role)) return true;
  if (input.planAccess === "public") return true;
  if (input.role === "guest") return false;
  if (input.planAccess === "member") return input.membershipStatus !== "canceled";
  return input.membershipStatus === "active" || input.membershipStatus === "trialing";
}
