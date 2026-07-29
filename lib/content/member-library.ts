import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getTenantId(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  return data?.id as string | undefined;
}

export async function getPublishedCourses(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id,title,description,access_level,publish_date,cover_image_url,content_url")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .not("content_url", "is", null)
    .order("publish_date", { ascending: false, nullsFirst: false });
  if (!error) return data ?? [];
  return [];
}

export async function getPublishedResources(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("id,title,description,access_level,resource_type,url,cover_image_url,created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .neq("url", "")
    .order("created_at", { ascending: false });
  return error ? [] : data ?? [];
}

export async function getPublishedEvents(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id,title,description,access_level,starts_at,location_url,cover_image_url")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  return data ?? [];
}
