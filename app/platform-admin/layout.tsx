import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { platformNavItems } from "@/lib/mock/podcastos";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  let tourIdentity: string | undefined;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const role = user?.app_metadata?.platform_role;
    tourIdentity = user?.id;
    if (!user) redirect("/login?next=%2Fplatform-admin");
    if (role !== "platform_owner" && role !== "platform_admin") redirect("/dashboard");
  }

  return <AppDashboardShell title="UpNexx Platform" subtitle="Super administration" nav={platformNavItems} userLabel="Platform Admin" tourIdentity={tourIdentity}>{children}</AppDashboardShell>;
}

