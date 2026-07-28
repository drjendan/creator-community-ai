import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

async function getTenantId(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  return data?.id as string | undefined;
}

export async function getPublishedCourses(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("courses")
    .select("id,title,description,access_level,publish_date,cover_image_url,content_url")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("publish_date", { ascending: false, nullsFirst: false });
  if (!error) return data ?? [];

  // Keep the member library usable until migration 0005 is installed.
  const { data: legacy } = await admin
    .from("courses")
    .select("id,title,description,access_level,publish_date,cover_image_url")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("publish_date", { ascending: false, nullsFirst: false });
  return (legacy ?? []).map((course) => ({
    ...course,
    content_url: course.cover_image_url,
    cover_image_url: null
  }));
}

export async function getPublishedResources(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("resources")
    .select("id,title,description,access_level,resource_type,url,cover_image_url,created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (!error) return data ?? [];

  const { data: legacy } = await admin
    .from("resources")
    .select("id,title,description,access_level,resource_type,url,created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return (legacy ?? []).map((resource) => ({ ...resource, cover_image_url: null }));
}

export async function getPublishedEvents(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select("id,title,description,access_level,starts_at,location_url,cover_image_url")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  return data ?? [];
}
