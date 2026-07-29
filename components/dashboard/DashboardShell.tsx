import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { dashboardNavItems } from "@/lib/navigation";

export function DashboardShell({ children, tenantName = "Your organization", userLabel, showPlatformAdmin = false, tourIdentity, nav = dashboardNavItems, brand }: { children: React.ReactNode; tenantName?: string; userLabel?: string; showPlatformAdmin?: boolean; tourIdentity?: string; nav?: { label: string; href: string }[]; brand?: { name?: string; tagline?: string; logoUrl?: string | null; primaryColor?: string } }) {
  return <AppDashboardShell title={tenantName} subtitle="Tenant administration" nav={nav} userLabel={userLabel} platformAdminHref={showPlatformAdmin ? "/platform-admin/tenants" : undefined} tourIdentity={tourIdentity} brand={brand}>{children}</AppDashboardShell>;
}
