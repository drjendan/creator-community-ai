import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { calculateOnboardingProgress } from "@/lib/onboarding";

type CountResult = { count: number | null };

function countQuery(supabase: Awaited<ReturnType<typeof getActiveTenantManager>> extends infer T ? T : never, table: string, tenantId: string) {
  if (!supabase) return Promise.resolve({ count: 0 } as CountResult);
  return supabase.supabase.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId) as unknown as Promise<CountResult>;
}

export type ChecklistItem = {
  label: string;
  complete: boolean;
  href: string;
};

export async function getTenantDashboardData() {
  const context = await getActiveTenantManager();
  if (!context) return null;
  const { supabase, tenant, role } = context;
  const tenantId = tenant.id;
  const admin = createAdminClient();

  const [
    courses, events, upcomingEvents, resources, spaces, posts, plans, episodes, aiGenerations,
    memberships, publishedCourses, publishedEvents, publishedResources, publishedEpisodes,
    brandingResult, domainResult, activityResult, aiProviderResult
  ] = await Promise.all([
    countQuery(context, "courses", tenantId),
    countQuery(context, "events", tenantId),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("starts_at", new Date().toISOString()),
    countQuery(context, "resources", tenantId),
    countQuery(context, "community_spaces", tenantId),
    countQuery(context, "community_posts", tenantId),
    countQuery(context, "tenant_membership_plans", tenantId),
    countQuery(context, "episodes", tenantId),
    countQuery(context, "ai_generations", tenantId),
    supabase.from("tenant_memberships").select("role,status").eq("tenant_id", tenantId).eq("status", "active"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "published"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "published"),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "published"),
    supabase.from("episodes").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "published"),
    supabase.from("tenant_branding").select("logo_url,footer_text").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_domains").select("id,status,is_primary").eq("tenant_id", tenantId).eq("status", "verified"),
    supabase.from("audit_logs").select("id,action,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
    admin.from("ai_provider_settings").select("id").eq("tenant_id", tenantId).eq("enabled", true).eq("is_default", true).eq("verification_status", "verified").maybeSingle()
  ]);

  const memberRows = memberships.data ?? [];
  const teamRoles = new Set(["tenant_owner", "tenant_admin", "content_manager", "community_moderator"]);
  const teamCount = memberRows.filter((row) => teamRoles.has(row.role)).length;
  const memberCount = memberRows.filter((row) => row.role === "member").length;
  const branding = brandingResult.data;
  const publishedCount =
    (publishedCourses.count ?? 0) +
    (publishedEvents.count ?? 0) +
    (publishedResources.count ?? 0) +
    (publishedEpisodes.count ?? 0);
  const platformPublished = publishedCount > 0 || (domainResult.data ?? []).some((domain) => domain.is_primary);

  const checklist: ChecklistItem[] = [
    { label: "Organization Created", complete: true, href: "/dashboard/settings" },
    { label: "Upload Organization Logo", complete: Boolean(branding?.logo_url), href: "/dashboard/branding" },
    { label: "Complete Organization Profile", complete: Boolean(branding?.footer_text), href: "/dashboard/settings" },
    { label: "Create Membership Plan", complete: (plans.count ?? 0) > 0, href: "/dashboard/memberships" },
    { label: "Create First Course", complete: (courses.count ?? 0) > 0, href: "/dashboard/courses" },
    { label: "Create First Event", complete: (events.count ?? 0) > 0, href: "/dashboard/events" },
    { label: "Upload First Resource", complete: (resources.count ?? 0) > 0, href: "/dashboard/resources" },
    { label: "Invite Team Members", complete: teamCount > 1, href: "/dashboard/team" },
    { label: "Invite Members", complete: memberCount > 0, href: "/dashboard/members" },
    { label: "Publish Your Platform", complete: platformPublished, href: "/dashboard/settings" }
  ];

  return {
    tenant,
    counts: {
      courses: courses.count ?? 0,
      events: upcomingEvents.count ?? 0,
      resources: resources.count ?? 0,
      communitySpaces: spaces.count ?? 0,
      communityPosts: posts.count ?? 0,
      membershipPlans: plans.count ?? 0,
      episodes: episodes.count ?? 0,
      aiGenerations: aiGenerations.count ?? 0,
      members: memberCount
    },
    checklist,
    progress: calculateOnboardingProgress(checklist),
    aiQuickStart: {
      ready: Boolean(aiProviderResult.data),
      canConfigure: role === "tenant_owner" || role === "tenant_admin"
    },
    activity: (activityResult.data ?? []).map((entry) => ({
      id: entry.id,
      label: entry.action.split(".").at(-1)?.replaceAll("_", " ") ?? entry.action,
      createdAt: entry.created_at
    }))
  };
}

export async function getTenantAnalyticsData() {
  const context = await getActiveTenantManager();
  if (!context) return null;
  const { data } = await context.supabase
    .from("usage_metrics")
    .select("id,metric,value,period_start,period_end")
    .eq("tenant_id", context.tenant.id)
    .order("period_end", { ascending: false });
  return { tenant: context.tenant, metrics: data ?? [] };
}

export async function getPlatformDashboardData() {
  const admin = createAdminClient();
  const [tenants, subscriptions, memberships, usage, support, activity] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("tenant_subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    admin.from("tenant_memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("ai_usage").select("input_tokens,output_tokens"),
    admin.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("audit_logs").select("id,action,created_at,tenant_id").order("created_at", { ascending: false }).limit(8)
  ]);
  const tokens = (usage.data ?? []).reduce((total, row) => total + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0), 0);
  return {
    totalTenants: tenants.count ?? 0,
    activeSubscriptions: subscriptions.count ?? 0,
    totalUsers: memberships.count ?? 0,
    aiTokens: tokens,
    openSupportRequests: support.count ?? 0,
    activity: activity.data ?? []
  };
}
