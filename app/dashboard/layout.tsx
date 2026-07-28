import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantManager } from "@/lib/tenant-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let showPlatformAdmin = false;
  let tourIdentity: string | undefined;
  let tenantName = "Your organization";
  let userLabel = "Account";
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
    if (context) tenantName = context.tenant.name;
  }

  return <DashboardShell tenantName={tenantName} userLabel={userLabel} showPlatformAdmin={showPlatformAdmin} tourIdentity={tourIdentity}>{children}</DashboardShell>;
}
