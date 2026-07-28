import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { dashboardNavItems } from "@/lib/navigation";

export function DashboardShell({ children, tenantName = "Your organization", userLabel, showPlatformAdmin = false, tourIdentity }: { children: React.ReactNode; tenantName?: string; userLabel?: string; showPlatformAdmin?: boolean; tourIdentity?: string }) {
  return <AppDashboardShell title={tenantName} subtitle="Tenant administration" nav={dashboardNavItems} userLabel={userLabel} platformAdminHref={showPlatformAdmin ? "/platform-admin/tenants" : undefined} tourIdentity={tourIdentity}>{children}</AppDashboardShell>;
}
