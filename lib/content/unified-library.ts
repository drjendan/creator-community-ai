import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UnifiedLibraryItem = {
  id: string;
  title: string;
  description: string;
  contentType: "episodes" | "courses" | "resources" | "events";
  accessLevel: string;
  date: string;
  href: string;
  external: boolean;
  categoryIds: string[];
};

export async function getUnifiedMemberLibrary(tenantSlug: string) {
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,name").eq("slug", tenantSlug).eq("status", "active").maybeSingle();
  if (!tenant) return null;
  const supabase = await createClient();
  const [episodes, courses, resources, events, categories, assignments] = await Promise.all([
    supabase.from("episodes").select("id,title,description,access_level,publish_date,updated_at").eq("tenant_id", tenant.id).eq("status", "published").order("publish_date", { ascending: false, nullsFirst: false }),
    supabase.from("courses").select("id,title,description,access_level,publish_date,updated_at").eq("tenant_id", tenant.id).eq("status", "published").order("publish_date", { ascending: false, nullsFirst: false }),
    supabase.from("resources").select("id,title,description,access_level,url,updated_at").eq("tenant_id", tenant.id).eq("status", "published").neq("url", "").order("updated_at", { ascending: false }),
    supabase.from("events").select("id,title,description,access_level,starts_at,updated_at").eq("tenant_id", tenant.id).eq("status", "published").order("starts_at", { ascending: true }),
    admin.from("content_categories").select("id,name,slug,content_type").eq("tenant_id", tenant.id).order("name"),
    admin.from("content_category_assignments").select("category_id,content_type,content_id").eq("tenant_id", tenant.id)
  ]);
  const assigned = new Map<string, string[]>();
  if (!assignments.error) for (const row of assignments.data ?? []) {
    const key = `${row.content_type}:${row.content_id}`;
    assigned.set(key, [...(assigned.get(key) ?? []), row.category_id]);
  }
  const items: UnifiedLibraryItem[] = [
    ...(episodes.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description ?? "", contentType: "episodes" as const, accessLevel: item.access_level, date: item.publish_date ?? item.updated_at, href: `/demo/${tenantSlug}/episodes/${item.id}`, external: false, categoryIds: assigned.get(`episodes:${item.id}`) ?? [] })),
    ...(courses.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description ?? "", contentType: "courses" as const, accessLevel: item.access_level, date: item.publish_date ?? item.updated_at, href: `/demo/${tenantSlug}/courses`, external: false, categoryIds: assigned.get(`courses:${item.id}`) ?? [] })),
    ...(resources.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description ?? "", contentType: "resources" as const, accessLevel: item.access_level, date: item.updated_at, href: item.url, external: true, categoryIds: assigned.get(`resources:${item.id}`) ?? [] })),
    ...(events.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description ?? "", contentType: "events" as const, accessLevel: item.access_level, date: item.starts_at ?? item.updated_at, href: `/demo/${tenantSlug}/events`, external: false, categoryIds: assigned.get(`events:${item.id}`) ?? [] }))
  ].sort((left, right) => right.date.localeCompare(left.date));
  return { tenant, items, categories: categories.data ?? [], consolidationInstalled: !categories.error && !assignments.error };
}
