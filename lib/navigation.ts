import { terminology } from "@/lib/terminology";

export type NavigationItem = {
  label: string;
  href: string;
  group?: string;
  featureKey?: string;
  permission?: string;
};

export const tenantNavigationGroups = {
  content: "Content",
  community: "Community",
  commerce: "Commerce",
  settings: "Settings"
} as const;

export const platformNavigationGroups = {
  billing: terminology.billingAndUsage,
  content: "Content & Templates",
  settings: "Settings"
} as const;

export const dashboardNavItems: NavigationItem[] = [
  { label: terminology.tenantAdminHub, href: "/dashboard", permission: "tenant.dashboard.view" },
  { label: terminology.gettingStarted, href: "/dashboard#getting-started", permission: "tenant.dashboard.view" },
  { label: "Podcasts", href: "/dashboard/podcast", group: tenantNavigationGroups.content, featureKey: "podcasts", permission: "tenant.content.view" },
  { label: "Courses", href: "/dashboard/courses", group: tenantNavigationGroups.content, featureKey: "courses", permission: "tenant.content.view" },
  { label: terminology.contentLibrary, href: "/dashboard/content-library", group: tenantNavigationGroups.content, permission: "tenant.content.view" },
  { label: "Resources", href: "/dashboard/resources", group: tenantNavigationGroups.content, featureKey: "resources", permission: "tenant.resources.manage" },
  { label: terminology.aiStudio, href: "/dashboard/ai-studio", group: tenantNavigationGroups.content, featureKey: "creator_ai_studio", permission: "tenant.ai.use" },
  { label: "Content Categories", href: "/dashboard/content/categories", group: tenantNavigationGroups.content, permission: "tenant.content.manage" },
  { label: "Content Settings", href: "/dashboard/content/settings", group: tenantNavigationGroups.content, permission: "tenant.content.manage" },
  { label: "Members", href: "/dashboard/members", group: tenantNavigationGroups.community, permission: "tenant.members.view" },
  { label: "Memberships", href: "/dashboard/memberships", group: tenantNavigationGroups.community, featureKey: "memberships", permission: "tenant.memberships.manage" },
  { label: "Events", href: "/dashboard/events", group: tenantNavigationGroups.community, featureKey: "events", permission: "tenant.events.manage" },
  { label: "Discussions", href: "/dashboard/community", group: tenantNavigationGroups.community, featureKey: "community", permission: "tenant.content.view" },
  { label: "Share Community", href: "/dashboard/community/share", group: tenantNavigationGroups.community, permission: "tenant.members.view" },
  { label: "Billing", href: "/dashboard/billing", group: tenantNavigationGroups.commerce, permission: "tenant.billing.view" },
  { label: "Shop", href: "/dashboard/shop", group: tenantNavigationGroups.commerce, permission: "tenant.content.view" },
  { label: "Payment Connections", href: "/dashboard/settings/integrations/payments", group: tenantNavigationGroups.commerce, permission: "tenant.billing.manage" },
  { label: terminology.communicationHub, href: "/dashboard/communications", featureKey: "communication_hub", permission: "tenant.communication.view" },
  { label: "Analytics", href: "/dashboard/analytics", permission: "tenant.analytics.view" },
  { label: "Team", href: "/dashboard/team", permission: "tenant.team.view" },
  { label: "Community Settings", href: "/dashboard/settings/community", permission: "tenant.settings.manage" },
  { label: "Testimonials", href: "/dashboard/settings/community/testimonials", group: tenantNavigationGroups.settings, permission: "tenant.settings.manage" },
  { label: "AI Providers", href: "/dashboard/settings/integrations/ai-providers", group: tenantNavigationGroups.settings, featureKey: "creator_ai_studio", permission: "tenant.settings.manage" },
  { label: "Member AI Coach", href: "/dashboard/settings/ai-coach", group: tenantNavigationGroups.settings, permission: "tenant.settings.manage" },
  { label: "Legal", href: "/dashboard/settings/legal", group: tenantNavigationGroups.settings, permission: "tenant.settings.manage" },
  { label: "Data Governance", href: "/dashboard/settings/data-governance", group: tenantNavigationGroups.settings, permission: "tenant.data.manage" },
  { label: "Custom Domains", href: "/dashboard/settings/domains", group: tenantNavigationGroups.settings, permission: "tenant.domains.manage" },
  { label: "Workspace Settings", href: "/dashboard/settings", group: tenantNavigationGroups.settings, permission: "tenant.settings.manage" },
  { label: "Support", href: "/dashboard/support" }
];

export const platformNavItems: NavigationItem[] = [
  { label: terminology.platformAdminHub, href: "/platform-admin", permission: "platform.dashboard.view" },
  { label: terminology.upnexxTenants, href: "/platform-admin/tenants", permission: "platform.tenants.view" },
  { label: terminology.platformTeam, href: "/platform-admin/team", permission: "platform.team.view" },
  { label: "Platform Analytics", href: "/platform-admin/analytics", permission: "platform.analytics.view" },
  { label: "Platform Communications", href: "/platform-admin/communications", permission: "platform.communication.view" },
  { label: "Platform Support", href: "/platform-admin/support", permission: "platform.support.view" },
  { label: "Security Events", href: "/platform-admin/security", permission: "platform.audit.view" },
  { label: "Operational Readiness", href: "/platform-admin/operations", permission: "platform.audit.view" },
  { label: "Isolation Verification", href: "/platform-admin/isolation", permission: "platform.audit.view" },
  { label: "Quality Verification", href: "/platform-admin/quality", permission: "platform.audit.view" },
  { label: "Custom Domains", href: "/platform-admin/domains", permission: "platform.audit.view" },
  { label: "Production Releases", href: "/platform-admin/releases", permission: "platform.audit.view" },
  { label: terminology.plansAndEntitlements, href: "/platform-admin/billing", group: platformNavigationGroups.billing, permission: "platform.billing.view" },
  { label: "Legal Center", href: "/platform-admin/legal", group: platformNavigationGroups.content, permission: "platform.content.manage" },
  { label: "Platform Settings", href: "/platform-admin/platform-settings", group: platformNavigationGroups.settings, permission: "platform.settings.manage" }
];
