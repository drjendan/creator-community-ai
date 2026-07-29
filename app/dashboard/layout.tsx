import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { dashboardNavItems } from "@/lib/navigation";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let showPlatformAdmin = false;
  let tourIdentity: string | undefined;
  let tenantName = "Your organization";
  let userLabel = "Account";
  let nav = dashboardNavItems.filter((item) => !item.featureKey);
  let brand: { name?: string; logoUrl?: string | null; primaryColor?: string } | undefined;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const role = user?.app_metadata?.platform_role;
    tourIdentity = user?.id;
    userLabel = user?.user_metadata?.full_name || user?.email || "Account";
    showPlatformAdmin = role === "platform_owner" || role === "platform_admin";
    const context = await getActiveTenantManager();
    if (context) {
      tenantName = context.tenant.name;
      const { data: branding } = await context.supabase
        .from("tenant_branding")
        .select("organization_short_name,logo_url,primary_color")
        .eq("tenant_id", context.tenant.id)
        .maybeSingle();
      brand = {
        name: branding?.organization_short_name || context.tenant.name,
        logoUrl: branding?.logo_url,
        primaryColor: branding?.primary_color
      };
      const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
      const role = context.role;
      const allowedByRole = (label: string) => {
        if (["tenant_owner", "tenant_admin"].includes(role)) return true;
        if (label === "Overview" || label === "Settings") return true;
        if (role === "communication_manager") return ["Communication Hub", "Announcements", "Messages", "Email Campaigns", "Templates", "Audience Segments", "Scheduled", "Reports", "Email Provider"].includes(label);
        if (role === "content_manager") return ["Podcast", "Courses", "Community", "Resources", "Events", "AI Studio"].includes(label);
        if (role === "course_manager") return label === "Courses";
        if (role === "event_manager") return label === "Events";
        if (["community_manager", "community_moderator"].includes(role)) return label === "Community";
        if (role === "analyst") return ["Analytics", "Reports"].includes(label);
        if (role === "support_staff") return label === "Members";
        return false;
      };
      nav = dashboardNavItems.filter((item) => allowedByRole(item.label) && (!item.featureKey || entitlements.get(item.featureKey) === true));
    }
  }

  return <DashboardShell tenantName={tenantName} userLabel={userLabel} showPlatformAdmin={showPlatformAdmin} tourIdentity={tourIdentity} nav={nav} brand={brand}>{children}</DashboardShell>;
}
