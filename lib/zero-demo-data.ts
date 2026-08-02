export const workspaceKinds = ["customer", "demo"] as const;

export type WorkspaceKind = (typeof workspaceKinds)[number];

export const customerProvisioningTables = [
  "tenants",
  "tenant_domains",
  "tenant_branding",
  "tenant_memberships",
  "tenant_subscriptions",
  "tenant_feature_entitlements",
  "tenant_ai_settings",
  "tenant_stripe_accounts",
  "feature_flags",
  "audit_logs"
] as const;

export const tenantBusinessDataTables = [
  "tenant_membership_plans",
  "member_subscriptions",
  "tenant_member_profiles",
  "podcasts",
  "episodes",
  "podcast_episodes",
  "courses",
  "course_enrollments",
  "community_spaces",
  "community_posts",
  "events",
  "resources",
  "communication_announcements",
  "communication_messages",
  "email_templates",
  "email_campaigns",
  "communication_automations",
  "payments",
  "billing_events",
  "usage_metrics",
  "ai_generations"
] as const;

export const dedicatedDemoHostname = "demo.upnexx.net";

export function canSeedDemoWorkspace(workspaceKind: WorkspaceKind, hostname: string) {
  return workspaceKind === "demo" && hostname.trim().toLowerCase() === dedicatedDemoHostname;
}

export function assertDemoWorkspaceSeedBoundary(workspaceKind: WorkspaceKind, hostname: string) {
  if (!canSeedDemoWorkspace(workspaceKind, hostname)) {
    throw new Error("Demo data may only be created in the explicitly marked demo workspace.");
  }
}
