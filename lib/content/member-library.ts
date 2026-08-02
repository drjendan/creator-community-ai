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
    .select("id,title,description,full_description,access_level,publish_date,cover_image_url,content_url,instructor,difficulty,estimated_duration_minutes,learning_objectives,prerequisites,featured")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("publish_date", { ascending: false, nullsFirst: false });
  if (error || !data?.length) return [];
  const courseIds = data.map((course) => course.id);
  const { data: modules } = await supabase.from("course_modules").select("id,course_id").in("course_id", courseIds);
  const moduleIds = (modules ?? []).map((module) => module.id);
  const { data: lessons } = moduleIds.length ? await supabase.from("lessons").select("id,module_id").in("module_id", moduleIds).eq("status", "published") : { data: [] };
  return data.map((course) => {
    const ownedModules = (modules ?? []).filter((module) => module.course_id === course.id);
    const ownedModuleIds = new Set(ownedModules.map((module) => module.id));
    return { ...course, module_count: ownedModules.length, lesson_count: (lessons ?? []).filter((lesson) => ownedModuleIds.has(lesson.module_id)).length };
  });
}

export async function getPublishedCourse(tenantSlug: string, courseId: string) {
  const courses = await getPublishedCourses(tenantSlug);
  const course = courses.find((item) => item.id === courseId);
  if (!course) return null;
  const supabase = await createClient();
  const { data: modules } = await supabase.from("course_modules").select("id,title,description,position").eq("course_id", courseId).order("position");
  const moduleIds = (modules ?? []).map((module) => module.id);
  const [{ data: lessons }, { data: materials }, { data: quizzes }] = await Promise.all([
    moduleIds.length ? supabase.from("lessons").select("id,module_id,title,lesson_type,is_required,estimated_duration_minutes,drip_days,position,content").in("module_id", moduleIds).eq("status", "published").order("position") : Promise.resolve({ data: [] }),
    supabase.from("course_materials").select("id,module_id,lesson_id,title,material_type,url,allow_download,version,sort_order").eq("course_id", courseId).eq("status", "published").order("sort_order"),
    supabase.from("course_quizzes").select("id,lesson_id,title,passing_score,attempts_allowed,is_required,time_limit_minutes,is_graded").eq("course_id", courseId).eq("status", "published")
  ]);
  return { course, modules: modules ?? [], lessons: lessons ?? [], materials: materials ?? [], quizzes: quizzes ?? [] };
}

export async function getPublishedResources(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("id,title,description,full_description,author,access_level,resource_type,url,cover_image_url,file_format,file_size_bytes,version_label,allow_download,featured,publish_date,created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .neq("url", "")
    .order("featured", { ascending: false })
    .order("publish_date", { ascending: false, nullsFirst: false });
  if (error || !data?.length) return [];
  const { data: bookmarks } = await supabase.from("resource_bookmarks").select("resource_id").in("resource_id", data.map((resource) => resource.id));
  const bookmarked = new Set((bookmarks ?? []).map((bookmark) => bookmark.resource_id));
  return data.map((resource) => ({ ...resource, bookmarked: bookmarked.has(resource.id), versions: [] as Array<Record<string, unknown>> }));
}

export async function getPublishedResource(tenantSlug: string, resourceId: string) {
  const resources = await getPublishedResources(tenantSlug); const resource = resources.find((item) => item.id === resourceId); if (!resource) return null;
  const supabase = await createClient(); const { data: versions } = await supabase.from("resource_versions").select("id,version_label,notes,url,file_format,file_size_bytes,allow_download,created_at").eq("resource_id", resourceId).eq("status", "published").order("created_at", { ascending: false });
  return { ...resource, versions: versions ?? [] };
}

export async function getPublishedEvents(tenantSlug: string) {
  const tenantId = await getTenantId(tenantSlug);
  if (!tenantId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id,title,description,access_level,starts_at,ends_at,timezone,event_format,venue_name,venue_address,location_url,cover_image_url,capacity,registration_required,registration_deadline,waitlist_enabled,member_instructions,featured")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  if (!data?.length) return [];
  const eventIds = data.map((event) => event.id);
  const [{ data: registrations }, { data: replays }] = await Promise.all([
    supabase.from("event_registrations").select("event_id,status").in("event_id", eventIds),
    supabase.from("event_replays").select("id,event_id,title,description,url,access_level,allow_download,sort_order").in("event_id", eventIds).eq("status", "published").order("sort_order")
  ]);
  return data.map((event) => ({ ...event, registration_status: (registrations ?? []).find((registration) => registration.event_id === event.id)?.status ?? null, replays: (replays ?? []).filter((replay) => replay.event_id === event.id) }));
}
