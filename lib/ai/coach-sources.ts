import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const coachSourceTypes = ["episode", "course", "lesson", "resource"] as const;
export type CoachSourceType = (typeof coachSourceTypes)[number];

export type CoachSource = { sourceType: CoachSourceType; sourceId: string; title: string; text: string; url: string; accessContentType: string; accessContentId: string; accessLevel: string };

export async function listCoachSourceCandidates(tenantId: string, tenantSlug: string) {
  const admin = createAdminClient();
  const [episodes, transcripts, courses, modules, lessons, resources] = await Promise.all([
    admin.from("episodes").select("id,title,description,access_level").eq("tenant_id", tenantId).eq("status", "published").order("title"),
    admin.from("episode_transcripts").select("episode_id,content").eq("tenant_id", tenantId).eq("status", "published"),
    admin.from("courses").select("id,title,description,full_description,access_level").eq("tenant_id", tenantId).eq("status", "published").order("title"),
    admin.from("course_modules").select("id,course_id,courses!inner(access_level)").eq("tenant_id", tenantId),
    admin.from("lessons").select("id,module_id,title,content").eq("tenant_id", tenantId).eq("status", "published").order("title"),
    admin.from("resources").select("id,title,description,url,access_level").eq("tenant_id", tenantId).eq("status", "published").order("title")
  ]);
  const transcriptByEpisode = new Map((transcripts.data ?? []).map((row) => [row.episode_id, row.content]));
  const courseByModule = new Map((modules.data ?? []).map((row) => [row.id, { id: row.course_id, accessLevel: (row.courses as unknown as { access_level: string })?.access_level ?? "member" }]));
  return [
    ...(episodes.data ?? []).map((row) => ({ sourceType: "episode" as const, sourceId: row.id, title: row.title, text: [row.description, transcriptByEpisode.get(row.id)].filter(Boolean).join("\n\n"), url: `/demo/${tenantSlug}/episodes/${row.id}`, accessContentType: "episode", accessContentId: row.id, accessLevel: row.access_level })),
    ...(courses.data ?? []).map((row) => ({ sourceType: "course" as const, sourceId: row.id, title: row.title, text: [row.description, row.full_description].filter(Boolean).join("\n\n"), url: `/demo/${tenantSlug}/courses/${row.id}`, accessContentType: "course", accessContentId: row.id, accessLevel: row.access_level })),
    ...(lessons.data ?? []).map((row) => { const content = row.content as { description?: string } | null; const course = courseByModule.get(row.module_id); return ({ sourceType: "lesson" as const, sourceId: row.id, title: row.title, text: content?.description ?? "", url: course ? `/demo/${tenantSlug}/courses/${course.id}` : `/demo/${tenantSlug}/courses`, accessContentType: "course", accessContentId: course?.id ?? row.id, accessLevel: course?.accessLevel ?? "member" }); }),
    ...(resources.data ?? []).map((row) => ({ sourceType: "resource" as const, sourceId: row.id, title: row.title, text: row.description ?? "", url: row.url, accessContentType: "resource", accessContentId: row.id, accessLevel: row.access_level }))
  ].filter((source) => source.text.trim().length >= 20);
}

export async function resolveCoachSource(tenantId: string, tenantSlug: string, sourceType: CoachSourceType, sourceId: string) {
  const candidates = await listCoachSourceCandidates(tenantId, tenantSlug);
  return candidates.find((source) => source.sourceType === sourceType && source.sourceId === sourceId) ?? null;
}

export type RetrievedCoachSource = { source_id: string; source_type: string; content_id: string; title: string; source_url: string; excerpt: string; relevance: number };

export async function retrieveCoachSources(tenantId: string, query: string, limit = 5, memberClient?: Awaited<ReturnType<typeof createClient>>) {
  const client = memberClient ?? await createClient();
  const { data, error } = await client.rpc("search_ai_coach_sources", { target_tenant: tenantId, search_query: query, max_results: limit });
  if (error) throw error;
  return (data ?? []) as RetrievedCoachSource[];
}
