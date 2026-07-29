import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tenant } from "@/lib/tenant-types";

export async function getTenantSiteBySlug(slug: string): Promise<Tenant | null> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id,name,slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return null;
  const [{ data: branding }, { data: entitlements }] = await Promise.all([admin
    .from("tenant_branding")
    .select("primary_color,secondary_color,accent_color,background_color,text_color,button_color,link_color,footer_text,logo_url,hero_image_url,email_logo_url,favicon_url,email_footer_text,welcome_headline,welcome_message,member_dashboard_greeting,support_email")
    .eq("tenant_id", tenant.id)
    .maybeSingle(), admin.from("tenant_feature_entitlements").select("feature_key,enabled").eq("tenant_id", tenant.id).eq("enabled", true)]);
  const enabledFeatures = (entitlements ?? []).map((item: { feature_key: string }) => item.feature_key);
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    tagline: branding?.footer_text || "Learning and community, in one place.",
    description: "",
    primaryColor: branding?.primary_color || "#102a56",
    secondaryColor: branding?.secondary_color || "#475569",
    accentColor: branding?.accent_color || "#7c3aed",
    backgroundColor: branding?.background_color || "#f8fafc",
    textColor: branding?.text_color || "#0f172a",
    buttonColor: branding?.button_color || branding?.accent_color || "#7c3aed",
    linkColor: branding?.link_color || branding?.accent_color || "#6d28d9",
    communicationEnabled: enabledFeatures.includes("communication_hub"),
    enabledFeatures,
    logoUrl: branding?.logo_url,
    heroImageUrl: branding?.hero_image_url,
    emailLogoUrl: branding?.email_logo_url,
    faviconUrl: branding?.favicon_url,
    emailFooterText: branding?.email_footer_text,
    dashboardGreeting: branding?.member_dashboard_greeting,
    welcomeHeadline: branding?.welcome_headline,
    welcomeMessage: branding?.welcome_message,
    supportEmail: branding?.support_email
  };
}

export async function tenantHasFeature(slug: string, featureKey: string) {
  const tenant = await getTenantSiteBySlug(slug);
  return Boolean(tenant?.enabledFeatures?.includes(featureKey));
}
