import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { calculateOnboardingProgress } from "@/lib/onboarding";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

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
  const context = await getActiveTenantWithPermission("tenant.dashboard.view");
  if (!context) return null;
  const { supabase, tenant, role } = context;
  const tenantId = tenant.id;
  const admin = createAdminClient();

  const [
    courses, events, upcomingEvents, resources, spaces, posts, plans, episodes, aiGenerations,
    memberships, publishedCourses, publishedEvents, publishedResources, publishedEpisodes,
    brandingResult, domainResult, activityResult, aiProviderResult, entitlementResult,
    emailProviderResult, paymentConnectionResult
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
    supabase.from("tenant_domains").select("id,status,is_primary").eq("tenant_id", tenantId).eq("status", "active"),
    supabase.from("audit_logs").select("id,action,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
    admin.from("ai_provider_settings").select("id").eq("tenant_id", tenantId).eq("enabled", true).eq("is_default", true).eq("verification_status", "verified").maybeSingle(),
    getTenantEntitlements(tenantId, supabase),
    supabase.from("tenant_communication_provider_configs").select("id").eq("tenant_id", tenantId).eq("is_active", true).eq("connection_status", "connected").maybeSingle(),
    supabase.from("tenant_stripe_accounts").select("id,status,charges_enabled").eq("tenant_id", tenantId).eq("status", "connected").maybeSingle()
  ]);

  const memberRows = memberships.data ?? [];
  const teamCount = memberRows.filter((row) => !["member", "guest"].includes(row.role)).length;
  const memberCount = memberRows.filter((row) => row.role === "member").length;
  const branding = brandingResult.data;
  const publishedCount =
    (publishedCourses.count ?? 0) +
    (publishedEvents.count ?? 0) +
    (publishedResources.count ?? 0) +
    (publishedEpisodes.count ?? 0);
  const platformPublished = publishedCount > 0 || (domainResult.data ?? []).some((domain) => domain.is_primary);
  const enabledFeatures = new Set(
    [...entitlementResult.entries()].filter(([, enabled]) => enabled).map(([key]) => key)
  );
  const contentConfigured =
    (courses.count ?? 0) +
    (events.count ?? 0) +
    (resources.count ?? 0) +
    (episodes.count ?? 0) > 0;
  const paymentConnected = Boolean(
    paymentConnectionResult.data?.status === "connected" &&
    paymentConnectionResult.data?.charges_enabled
  );

  const checklist: ChecklistItem[] = [
    { label: "Organization Created", complete: true, href: "/dashboard/settings" },
    { label: "Upload Organization Logo", complete: Boolean(branding?.logo_url), href: "/dashboard/branding" },
    { label: "Complete Organization Profile", complete: Boolean(branding?.footer_text), href: "/dashboard/settings" },
    ...(enabledFeatures.has("memberships") ? [{ label: "Create Membership Plan", complete: (plans.count ?? 0) > 0, href: "/dashboard/memberships" }] : []),
    ...(enabledFeatures.has("courses") ? [{ label: "Create First Course", complete: (courses.count ?? 0) > 0, href: "/dashboard/courses" }] : []),
    ...(enabledFeatures.has("events") ? [{ label: "Create First Event", complete: (events.count ?? 0) > 0, href: "/dashboard/events" }] : []),
    ...(enabledFeatures.has("resources") ? [{ label: "Upload First Resource", complete: (resources.count ?? 0) > 0, href: "/dashboard/resources" }] : []),
    { label: "Invite Team Members", complete: teamCount > 1, href: "/dashboard/team" },
    { label: "Invite Members", complete: memberCount > 0, href: "/dashboard/members" },
    ...(enabledFeatures.has("communication_hub") ? [{ label: "Connect Email", complete: Boolean(emailProviderResult.data), href: "/dashboard/communications/settings" }] : []),
    { label: "Add Your First Content", complete: contentConfigured, href: "/dashboard/content-library" },
    { label: "Review Payment Connection", complete: paymentConnected, href: "/dashboard/settings/integrations/payments" },
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
      members: memberCount,
      teamMembers: teamCount,
      publishedContent: publishedCount
    },
    checklist,
    progress: calculateOnboardingProgress(checklist),
    aiQuickStart: enabledFeatures.has("creator_ai_studio") ? {
      ready: Boolean(aiProviderResult.data),
      canConfigure: role === "tenant_owner" || role === "tenant_admin"
    } : null,
    communicationQuickStart: enabledFeatures.has("communication_hub") ? {
      ready: Boolean(emailProviderResult.data),
      canConfigure: ["tenant_owner", "tenant_admin", "communication_manager"].includes(role)
    } : null,
    readiness: {
      profileComplete: Boolean(branding?.footer_text),
      brandingComplete: Boolean(branding?.logo_url),
      teamInvited: teamCount > 1,
      senderConnected: Boolean(emailProviderResult.data),
      contentConfigured,
      membershipConfigured: (plans.count ?? 0) > 0,
      paymentConnected
    },
    enabledFeatures: [...enabledFeatures],
    activity: (activityResult.data ?? []).map((entry) => ({
      id: entry.id,
      label: entry.action.split(".").at(-1)?.replaceAll("_", " ") ?? entry.action,
      createdAt: entry.created_at
    }))
  };
}

export async function getTenantAnalyticsData() {
  const context = await getActiveTenantWithPermission("tenant.analytics.view");
  if (!context) return null;
  const { supabase, tenant } = context;
  const tenantId = tenant.id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const [
    metricResult, membershipResult, enrollmentResult, progressResult,
    registrationResult, postResult, recipientResult, aiResult
  ] = await Promise.all([
    supabase.from("usage_metrics").select("id,metric,value,period_start,period_end").eq("tenant_id", tenantId).order("period_end", { ascending: false }),
    supabase.from("tenant_memberships").select("id,role,status,created_at").eq("tenant_id", tenantId),
    supabase.from("course_enrollments").select("id,status,enrolled_at").eq("tenant_id", tenantId),
    supabase.from("lesson_progress").select("id,status,progress_percent,completed_at,updated_at").eq("tenant_id", tenantId),
    supabase.from("event_registrations").select("id,created_at").eq("tenant_id", tenantId),
    supabase.from("community_posts").select("id,status,created_at").eq("tenant_id", tenantId),
    supabase.from("email_campaign_recipients").select("id,status,delivered_at,failed_at,created_at").eq("tenant_id", tenantId),
    supabase.from("ai_usage").select("input_tokens,output_tokens,cost,created_at").eq("tenant_id", tenantId)
  ]);

  const activeMembers = (membershipResult.data ?? []).filter((row) => row.status === "active" && row.role === "member");
  const lessonRows = progressResult.data ?? [];
  const recipientRows = recipientResult.data ?? [];
  const aiRows = aiResult.data ?? [];
  const aiTokens30d = aiRows
    .filter((row) => row.created_at >= thirtyDaysAgo)
    .reduce((total, row) => total + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0), 0);

  return {
    tenant,
    metrics: metricResult.data ?? [],
    generatedAt: now.toISOString(),
    summary: {
      activeMembers: activeMembers.length,
      newMembers30d: activeMembers.filter((row) => row.created_at >= thirtyDaysAgo).length,
      courseEnrollments: (enrollmentResult.data ?? []).filter((row) => row.status === "active").length,
      completedLessons: lessonRows.filter((row) => row.status === "completed" || Number(row.progress_percent) === 100).length,
      averageLessonProgress: lessonRows.length
        ? Math.round(lessonRows.reduce((total, row) => total + Number(row.progress_percent ?? 0), 0) / lessonRows.length)
        : 0,
      eventRegistrations: registrationResult.data?.length ?? 0,
      communityPosts30d: (postResult.data ?? []).filter((row) => row.status === "published" && row.created_at >= thirtyDaysAgo).length,
      emailsDelivered: recipientRows.filter((row) => row.status === "delivered" || Boolean(row.delivered_at)).length,
      emailsFailed: recipientRows.filter((row) => row.status === "failed" || Boolean(row.failed_at)).length,
      aiTokens30d
    }
  };
}

export async function getPlatformAnalyticsData() {
  const access = await getPlatformAdministrator("platform.analytics.view");
  if (!access) return null;
  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const [tenants, memberships, subscriptions, usage, support] = await Promise.all([
    admin.from("tenants").select("id,status,created_at"),
    admin.from("tenant_memberships").select("id,tenant_id,role,status,created_at"),
    admin.from("tenant_subscriptions").select("id,tenant_id,status,created_at"),
    admin.from("ai_usage").select("tenant_id,input_tokens,output_tokens,cost,created_at"),
    admin.from("support_requests").select("id,tenant_id,status,created_at")
  ]);
  const tenantRows = tenants.data ?? [];
  const memberRows = memberships.data ?? [];
  const subscriptionRows = subscriptions.data ?? [];
  const usageRows = usage.data ?? [];
  const supportRows = support.data ?? [];
  const tenantStatusCounts = tenantRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
  const subscriptionStatusCounts = subscriptionRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
  const tokens30d = usageRows
    .filter((row) => row.created_at >= thirtyDaysAgo)
    .reduce((total, row) => total + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0), 0);
  const cost30d = usageRows
    .filter((row) => row.created_at >= thirtyDaysAgo)
    .reduce((total, row) => total + Number(row.cost ?? 0), 0);

  return {
    generatedAt: now.toISOString(),
    summary: {
      totalTenants: tenantRows.length,
      activeTenants: tenantStatusCounts.active ?? 0,
      newTenants30d: tenantRows.filter((row) => row.created_at >= thirtyDaysAgo).length,
      activeMembers: memberRows.filter((row) => row.status === "active" && row.role === "member").length,
      activeSubscriptions: subscriptionRows.filter((row) => ["active", "trialing"].includes(row.status)).length,
      aiTokens30d: tokens30d,
      aiCost30d: cost30d,
      openSupportRequests: supportRows.filter((row) => row.status === "open").length
    },
    tenantStatusCounts,
    subscriptionStatusCounts
  };
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

export async function getPlatformBillingSummary() {
  const admin = createAdminClient();
  const [{ data: plans }, { data: subscriptions }, { data: usage }] = await Promise.all([
    admin.from("platform_plans").select("id,name,slug,status,price_monthly,price_annual,currency,stripe_monthly_price_id,stripe_annual_price_id").order("price_monthly"),
    admin.from("tenant_subscriptions").select("tenant_id,plan_id,status,ai_credit_allowance"),
    admin.from("ai_usage").select("input_tokens,output_tokens")
  ]);
  const statusCounts = (subscriptions ?? []).reduce<Record<string, number>>((counts, subscription) => {
    counts[subscription.status] = (counts[subscription.status] ?? 0) + 1;
    return counts;
  }, {});
  const planCounts = new Map<string, number>();
  for (const subscription of subscriptions ?? []) {
    if (subscription.plan_id) planCounts.set(subscription.plan_id, (planCounts.get(subscription.plan_id) ?? 0) + 1);
  }
  return {
    plans: (plans ?? []).map((plan) => ({ ...plan, tenantCount: planCounts.get(plan.id) ?? 0 })),
    totalSubscriptions: subscriptions?.length ?? 0,
    statusCounts,
    totalAiAllowance: (subscriptions ?? []).reduce((total, subscription) => total + Number(subscription.ai_credit_allowance ?? 0), 0),
    totalAiTokens: (usage ?? []).reduce((total, row) => total + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0), 0)
  };
}
