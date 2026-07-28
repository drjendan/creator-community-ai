import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let showPlatformAdmin = false;
  let tourIdentity: string | undefined;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const role = user?.app_metadata?.platform_role;
    tourIdentity = user?.id;
    showPlatformAdmin = role === "platform_owner" || role === "platform_admin";
  }

  return <DashboardShell showPlatformAdmin={showPlatformAdmin} tourIdentity={tourIdentity}>{children}</DashboardShell>;
}
