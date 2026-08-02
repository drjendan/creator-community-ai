import type { Role } from "@/lib/roles";

export const platformRoleKeys = [
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_billing_admin",
  "platform_content_admin",
  "platform_analyst",
  "platform_developer"
] as const;

export type PlatformRole = (typeof platformRoleKeys)[number];

export const platformPermissionKeys = [
  "platform.dashboard.view",
  "platform.team.view",
  "platform.team.invite",
  "platform.team.manage_roles",
  "platform.team.grant_owner",
  "platform.team.suspend",
  "platform.team.remove",
  "platform.tenants.view",
  "platform.tenants.manage",
  "platform.billing.view",
  "platform.billing.manage",
  "platform.support.view",
  "platform.support.manage",
  "platform.communication.view",
  "platform.communication.manage",
  "platform.content.manage",
  "platform.analytics.view",
  "platform.settings.manage",
  "platform.audit.view",
  "platform.security.manage",
  "platform.operations.manage",
  "platform.quality.manage",
  "platform.release.manage",
  "platform.release.approve",
  "platform.integrations.manage"
] as const;

export type PlatformPermission = (typeof platformPermissionKeys)[number];

export const platformRoleLabels: Record<PlatformRole, string> = {
  platform_owner: "Platform Owner",
  platform_admin: "Platform Administrator",
  platform_support: "Platform Support",
  platform_billing_admin: "Platform Billing Administrator",
  platform_content_admin: "Platform Content Administrator",
  platform_analyst: "Platform Analyst",
  platform_developer: "Platform Developer"
};

const allPlatformPermissions = new Set<PlatformPermission>(platformPermissionKeys);

export const platformRolePermissions: Record<PlatformRole, ReadonlySet<PlatformPermission>> = {
  platform_owner: allPlatformPermissions,
  platform_admin: new Set(platformPermissionKeys.filter((permission) => !["platform.team.grant_owner", "platform.release.approve"].includes(permission))),
  platform_support: new Set(["platform.dashboard.view", "platform.team.view", "platform.tenants.view", "platform.support.view", "platform.support.manage"]),
  platform_billing_admin: new Set(["platform.dashboard.view", "platform.team.view", "platform.tenants.view", "platform.billing.view", "platform.billing.manage"]),
  platform_content_admin: new Set(["platform.dashboard.view", "platform.team.view", "platform.tenants.view", "platform.content.manage", "platform.communication.view"]),
  platform_analyst: new Set(["platform.dashboard.view", "platform.team.view", "platform.tenants.view", "platform.analytics.view", "platform.audit.view"]),
  platform_developer: new Set(["platform.dashboard.view", "platform.team.view", "platform.tenants.view", "platform.settings.manage", "platform.audit.view", "platform.quality.manage", "platform.integrations.manage"])
};

export function isPlatformRole(value: unknown): value is PlatformRole {
  return platformRoleKeys.includes(value as PlatformRole);
}

export function platformRoleHasPermission(
  role: PlatformRole,
  permission: PlatformPermission
) {
  return platformRolePermissions[role].has(permission);
}

export const tenantTeamRoleKeys = [
  "tenant_admin",
  "billing_admin",
  "communication_manager",
  "content_manager",
  "support_manager",
  "analyst",
  "contributor",
  "viewer"
] as const;

export type TenantTeamRole = (typeof tenantTeamRoleKeys)[number];

export const tenantTeamRoleLabels: Record<TenantTeamRole | "tenant_owner", string> = {
  tenant_owner: "Tenant Owner",
  tenant_admin: "Tenant Administrator",
  billing_admin: "Billing Administrator",
  communication_manager: "Communications Manager",
  content_manager: "Content Manager",
  support_manager: "Support Manager",
  analyst: "Analyst",
  contributor: "Contributor",
  viewer: "Viewer"
};

export const tenantPermissionKeys = [
  "tenant.dashboard.view",
  "tenant.members.view",
  "tenant.members.manage",
  "tenant.team.view",
  "tenant.team.invite",
  "tenant.team.manage_roles",
  "tenant.team.suspend",
  "tenant.team.remove",
  "tenant.billing.view",
  "tenant.billing.manage",
  "tenant.content.view",
  "tenant.content.create",
  "tenant.content.edit",
  "tenant.content.publish",
  "tenant.community.manage",
  "tenant.courses.manage",
  "tenant.podcasts.manage",
  "tenant.events.manage",
  "tenant.resources.manage",
  "tenant.memberships.manage",
  "tenant.shop.manage",
  "tenant.orders.view",
  "tenant.communication.view",
  "tenant.communication.create",
  "tenant.communication.approve",
  "tenant.communication.send",
  "tenant.communications.manage",
  "tenant.content.manage",
  "tenant.support.manage",
  "tenant.analytics.view",
  "tenant.insights.manage",
  "tenant.data.manage",
  "tenant.domains.manage",
  "tenant.settings.manage",
  "tenant.ai.use",
  "tenant.workspace.view"
] as const;

export type TenantPermission = (typeof tenantPermissionKeys)[number];

const tenantManagerPermissions = new Set<TenantPermission>([
  "tenant.dashboard.view",
  "tenant.members.view",
  "tenant.members.manage",
  "tenant.team.view",
  "tenant.team.invite",
  "tenant.team.manage_roles",
  "tenant.team.suspend",
  "tenant.team.remove",
  "tenant.billing.view",
  "tenant.billing.manage",
  "tenant.content.view",
  "tenant.content.create",
  "tenant.content.edit",
  "tenant.content.publish",
  "tenant.community.manage",
  "tenant.courses.manage",
  "tenant.podcasts.manage",
  "tenant.events.manage",
  "tenant.resources.manage",
  "tenant.memberships.manage",
  "tenant.shop.manage",
  "tenant.orders.view",
  "tenant.communication.view",
  "tenant.communication.create",
  "tenant.communication.approve",
  "tenant.communication.send",
  "tenant.communications.manage",
  "tenant.content.manage",
  "tenant.support.manage",
  "tenant.analytics.view",
  "tenant.insights.manage",
  "tenant.data.manage",
  "tenant.domains.manage",
  "tenant.settings.manage",
  "tenant.ai.use",
  "tenant.workspace.view"
]);

export const tenantRolePermissions: Partial<Record<Role | TenantTeamRole, ReadonlySet<TenantPermission>>> = {
  tenant_owner: new Set(tenantPermissionKeys),
  tenant_admin: tenantManagerPermissions,
  billing_admin: new Set(["tenant.dashboard.view", "tenant.billing.view", "tenant.billing.manage", "tenant.orders.view", "tenant.workspace.view"]),
  communication_manager: new Set(["tenant.dashboard.view", "tenant.communication.view", "tenant.communication.create", "tenant.communication.approve", "tenant.communication.send", "tenant.communications.manage", "tenant.workspace.view"]),
  content_manager: new Set(["tenant.dashboard.view", "tenant.content.view", "tenant.content.create", "tenant.content.edit", "tenant.content.publish", "tenant.community.manage", "tenant.courses.manage", "tenant.podcasts.manage", "tenant.events.manage", "tenant.resources.manage", "tenant.memberships.manage", "tenant.content.manage", "tenant.ai.use", "tenant.workspace.view"]),
  support_manager: new Set(["tenant.dashboard.view", "tenant.members.view", "tenant.members.manage", "tenant.support.manage", "tenant.workspace.view"]),
  analyst: new Set(["tenant.dashboard.view", "tenant.members.view", "tenant.content.view", "tenant.billing.view", "tenant.orders.view", "tenant.communication.view", "tenant.analytics.view", "tenant.insights.manage", "tenant.workspace.view"]),
  contributor: new Set(["tenant.dashboard.view", "tenant.content.view", "tenant.content.create", "tenant.content.edit", "tenant.content.manage", "tenant.ai.use", "tenant.workspace.view"]),
  viewer: new Set(["tenant.dashboard.view", "tenant.members.view", "tenant.content.view", "tenant.workspace.view"]),
  course_manager: new Set(["tenant.dashboard.view", "tenant.content.view", "tenant.content.create", "tenant.content.edit", "tenant.content.publish", "tenant.courses.manage", "tenant.content.manage", "tenant.ai.use", "tenant.workspace.view"]),
  event_manager: new Set(["tenant.dashboard.view", "tenant.content.view", "tenant.content.create", "tenant.content.edit", "tenant.content.publish", "tenant.events.manage", "tenant.content.manage", "tenant.workspace.view"]),
  community_manager: new Set(["tenant.dashboard.view", "tenant.members.view", "tenant.members.manage", "tenant.content.view", "tenant.community.manage", "tenant.workspace.view"]),
  community_moderator: new Set(["tenant.dashboard.view", "tenant.members.view", "tenant.content.view", "tenant.community.manage", "tenant.workspace.view"]),
  support_staff: new Set(["tenant.dashboard.view", "tenant.members.view", "tenant.support.manage", "tenant.workspace.view"])
};

export function tenantRoleHasPermission(role: string, permission: TenantPermission) {
  return tenantRolePermissions[role as Role | TenantTeamRole]?.has(permission) ?? false;
}
