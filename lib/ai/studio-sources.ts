import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const studioSourceTypes = ["manual", "podcast_transcript", "course", "lesson", "document", "event", "community_discussion"] as const;
export type StudioSourceType = (typeof studioSourceTypes)[number];
export type StudioSourceOption = { id: string; title: string; preview: string };

function preview(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function lessonText(content: unknown) {
  if (!content || typeof content !== "object") return "";
  const values = Object.values(content as Record<string, unknown>).filter((value) => typeof value === "string");
  return values.join("\n");
}

export async function listStudioSources(tenantId: string) {
  const admin = createAdminClient();
  const [episodes, courses, lessons, resources, events, posts] = await Promise.all([
    admin.from("episodes").select("id,title,description").eq("tenant_id", tenantId).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
    admin.from("courses").select("id,title,description").eq("tenant_id", tenantId).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
    admin.from("lessons").select("id,title,content").eq("tenant_id", tenantId).neq("status", "archived").order("updated_at", { ascending: false }).limit(150),
    admin.from("resources").select("id,title,description").eq("tenant_id", tenantId).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
    admin.from("events").select("id,title,description").eq("tenant_id", tenantId).neq("status", "archived").order("updated_at", { ascending: false }).limit(100),
    admin.from("community_posts").select("id,title,body").eq("tenant_id", tenantId).neq("status", "archived").order("updated_at", { ascending: false }).limit(100)
  ]);
  const error = [episodes.error, courses.error, lessons.error, resources.error, events.error, posts.error].find(Boolean);
  if (error) throw new Error(error.message);
  return {
    podcast_transcript: (episodes.data ?? []).map((row) => ({ id: row.id, title: row.title, preview: preview(row.description) })),
    course: (courses.data ?? []).map((row) => ({ id: row.id, title: row.title, preview: preview(row.description) })),
    lesson: (lessons.data ?? []).map((row) => ({ id: row.id, title: row.title, preview: preview(lessonText(row.content)) })),
    document: (resources.data ?? []).map((row) => ({ id: row.id, title: row.title, preview: preview(row.description) })),
    event: (events.data ?? []).map((row) => ({ id: row.id, title: row.title, preview: preview(row.description) })),
    community_discussion: (posts.data ?? []).map((row) => ({ id: row.id, title: row.title || "Community discussion", preview: preview(row.body) }))
  } satisfies Record<Exclude<StudioSourceType, "manual">, StudioSourceOption[]>;
}

export async function resolveStudioSource(input: { tenantId: string; sourceType: StudioSourceType; sourceId?: string; sourceText?: string }) {
  if (input.sourceType === "manual") {
    const text = input.sourceText?.trim() ?? "";
    if (text.length < 20) throw new Error("Enter at least 20 characters of source content.");
    return { title: "Start from scratch", text };
  }
  if (!input.sourceId) throw new Error("Choose a source from this tenant.");
  const admin = createAdminClient();
  if (input.sourceType === "podcast_transcript") {
    const [{ data: episode }, { data: transcripts }] = await Promise.all([
      admin.from("episodes").select("id,title,description").eq("tenant_id", input.tenantId).eq("id", input.sourceId).maybeSingle(),
      admin.from("episode_transcripts").select("content").eq("tenant_id", input.tenantId).eq("episode_id", input.sourceId).order("updated_at", { ascending: false })
    ]);
    if (!episode) throw new Error("The selected podcast episode is unavailable.");
    return ensureSource(episode.title, [episode.description, ...(transcripts ?? []).map((row) => row.content)]);
  }
  if (input.sourceType === "course") {
    const { data: course } = await admin.from("courses").select("id,title,description").eq("tenant_id", input.tenantId).eq("id", input.sourceId).maybeSingle();
    if (!course) throw new Error("The selected course is unavailable.");
    const { data: modules } = await admin.from("course_modules").select("id,title").eq("tenant_id", input.tenantId).eq("course_id", course.id).order("position");
    const moduleIds = (modules ?? []).map((module) => module.id);
    const { data: lessons } = moduleIds.length ? await admin.from("lessons").select("title,content,module_id").eq("tenant_id", input.tenantId).in("module_id", moduleIds).order("position") : { data: [] };
    return ensureSource(course.title, [course.description, ...(modules ?? []).flatMap((module) => [module.title, ...(lessons ?? []).filter((lesson) => lesson.module_id === module.id).flatMap((lesson) => [lesson.title, lessonText(lesson.content)])])]);
  }
  const tables = {
    lesson: { table: "lessons", select: "id,title,content" },
    document: { table: "resources", select: "id,title,description,url" },
    event: { table: "events", select: "id,title,description,starts_at,location_url" },
    community_discussion: { table: "community_posts", select: "id,title,body" }
  } as const;
  const config = tables[input.sourceType];
  const { data } = await admin.from(config.table).select(config.select).eq("tenant_id", input.tenantId).eq("id", input.sourceId).maybeSingle();
  if (!data) throw new Error("The selected source is unavailable.");
  const row = data as unknown as Record<string, unknown>;
  return ensureSource(String(row.title || "Community discussion"), [row.description, row.body, lessonText(row.content), row.starts_at, row.location_url, row.url]);
}

function ensureSource(title: string, values: unknown[]) {
  const text = values.map((value) => String(value ?? "").trim()).filter(Boolean).join("\n\n").slice(0, 50000);
  if (text.length < 20) throw new Error("The selected source does not contain enough text to generate from.");
  return { title, text };
}
