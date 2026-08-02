import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { dashboardNavItems } from "@/lib/navigation";
import type { DashboardNavItem } from "@/components/dashboard/AppDashboardShell";
import type { TrialExperienceState } from "@/components/dashboard/TrialExperience";

export function DashboardShell({ children, tenantName = "Your organization", userLabel, showPlatformAdmin = false, tourIdentity, nav = dashboardNavItems, brand, trial }: { children: React.ReactNode; tenantName?: string; userLabel?: string; showPlatformAdmin?: boolean; tourIdentity?: string; nav?: DashboardNavItem[]; brand?: { name?: string; tagline?: string; logoUrl?: string | null; primaryColor?: string }; trial?: TrialExperienceState }) {
  return <AppDashboardShell title={tenantName} subtitle="Tenant Administration" nav={nav} userLabel={userLabel} platformAdminHref={showPlatformAdmin ? "/platform-admin/tenants" : undefined} tourIdentity={tourIdentity} brand={brand} trial={trial}>{children}</AppDashboardShell>;
}
