import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { platformNavItems } from "@/lib/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  let tourIdentity: string | undefined;
  let userLabel = "Platform administrator";
  let platformBrand: { name?: string; tagline?: string; logoUrl?: string | null; primaryColor?: string } | undefined;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const role = user?.app_metadata?.platform_role;
    tourIdentity = user?.id;
    userLabel = user?.user_metadata?.full_name || user?.email || "Platform administrator";
    if (!user) redirect("/login?next=%2Fplatform-admin");
    if (role !== "platform_owner" && role !== "platform_admin") redirect("/dashboard");
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

  return <AppDashboardShell title={platformBrand?.name ? `${platformBrand.name} Platform` : "UpNexx Platform"} subtitle="Platform administration" nav={platformNavItems} userLabel={userLabel} tourIdentity={tourIdentity} brand={platformBrand}>{children}</AppDashboardShell>;
}

