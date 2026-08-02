import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { platformNavItems } from "@/lib/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCurrentLegalAcceptance } from "@/lib/legal";
import { getPlatformAccess } from "@/lib/platform-context";
import type { PlatformPermission } from "@/lib/permissions";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  let tourIdentity: string | undefined;
  let userLabel = "Platform administrator";
  let nav = platformNavItems.filter((item) => !item.permission);
  let platformBrand: { name?: string; tagline?: string; logoUrl?: string | null; primaryColor?: string } | undefined;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    tourIdentity = user?.id;
    userLabel = user?.user_metadata?.full_name || user?.email || "Platform administrator";
    if (!user) redirect("/login?next=%2Fplatform-admin");
    if (!(await hasCurrentLegalAcceptance(user.id))) redirect("/legal/accept?next=%2Fplatform-admin");
    const access = await getPlatformAccess();
    if (!access) redirect("/dashboard");
    nav = platformNavItems.filter((item) =>
      !item.permission || access.permissions.has(item.permission as PlatformPermission)
    );
    const { data: branding } = await createAdminClient()
      .from("platform_branding")
      .select("platform_name,tagline,logo_url,primary_color")
      .eq("id", true)
      .maybeSingle();
    if (branding) {
      platformBrand = {
        name: branding.platform_name,
        tagline: branding.tagline,
        logoUrl: branding.logo_url,
        primaryColor: branding.primary_color
      };
    }
  }

  return <AppDashboardShell title={platformBrand?.name ? `${platformBrand.name} Platform` : "UpNexx Platform"} subtitle="Platform Administration" nav={nav} userLabel={userLabel} tourIdentity={tourIdentity} brand={platformBrand}>{children}</AppDashboardShell>;
}

