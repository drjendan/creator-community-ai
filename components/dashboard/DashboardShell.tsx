import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { dashboardNavItems, demoTenant } from "@/lib/mock/podcastos";

export function DashboardShell({ children, showPlatformAdmin = false, tourIdentity }: { children: React.ReactNode; showPlatformAdmin?: boolean; tourIdentity?: string }) {
  return <AppDashboardShell title={demoTenant.name} subtitle="Tenant administration" nav={dashboardNavItems} platformAdminHref={showPlatformAdmin ? "/platform-admin/tenants" : undefined} tourIdentity={tourIdentity}>{children}</AppDashboardShell>;
}
