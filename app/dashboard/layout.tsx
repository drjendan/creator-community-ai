import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantManager, getTenantPermissionSet } from "@/lib/tenant-context";
import { dashboardNavItems } from "@/lib/navigation";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { hasCurrentLegalAcceptance } from "@/lib/legal";
import { redirect } from "next/navigation";
import { getTenantTrialAccess } from "@/lib/trials";
import type { TrialExperienceState } from "@/components/dashboard/TrialExperience";
import { getPlatformAccess } from "@/lib/platform-context";
import type { TenantPermission } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let showPlatformAdmin = false;
  let tourIdentity: string | undefined;
  let tenantName = "Your organization";
  let userLabel = "Account";
  let nav = dashboardNavItems.filter((item) => !item.featureKey);
  let brand: { name?: string; logoUrl?: string | null; primaryColor?: string } | undefined;
  let trial: TrialExperienceState | undefined;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user && !(await hasCurrentLegalAcceptance(user.id))) redirect("/legal/accept?next=%2Fdashboard");
    tourIdentity = user?.id;
    userLabel = user?.user_metadata?.full_name || user?.email || "Account";
    showPlatformAdmin = Boolean(user && await getPlatformAccess());
    const context = await getActiveTenantManager();
    if (user && !context) {
      const platformAccess = await getPlatformAccess();
      redirect(platformAccess ? "/platform-admin" : "/");
    }
    if (context) {
      tenantName = context.tenant.name;
      trial = await getTenantTrialAccess(context.tenant.id);
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
      const permissions = await getTenantPermissionSet(context.role);
      nav = dashboardNavItems
        .filter((item) => !item.permission || permissions.has(item.permission as TenantPermission))
        .map((item) => ({
          ...item,
          locked: Boolean(item.featureKey && entitlements.get(item.featureKey) !== true),
          lockedReason: item.featureKey && entitlements.get(item.featureKey) !== true
            ? `${item.label} is not included in this tenant's current plan.`
            : undefined
        }));
    }
  }

  return <DashboardShell tenantName={tenantName} userLabel={userLabel} showPlatformAdmin={showPlatformAdmin} tourIdentity={tourIdentity} nav={nav} brand={brand} trial={trial}>{children}</DashboardShell>;
}
