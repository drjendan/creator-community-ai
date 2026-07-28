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
  const { data: branding } = await admin
    .from("tenant_branding")
    .select("primary_color,accent_color,footer_text")
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    tagline: branding?.footer_text || "Learning and community, in one place.",
    description: "",
    primaryColor: branding?.primary_color || "#102a56",
    accentColor: branding?.accent_color || "#7c3aed"
  };
}
