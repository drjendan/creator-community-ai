import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActiveTenantManager, getActiveTenantWithPermission } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { trialMutationError } from "@/lib/trials";
import { createAdminClient } from "@/lib/supabase/admin";

const contentTypes = ["episodes", "courses", "events", "resources", "community"] as const;
type ContentType = (typeof contentTypes)[number];

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).optional().default(""),
  status: z.string().trim().max(30).default("draft"),
  accessLevel: z.enum(["public", "member", "paid"]).default("member"),
  publishDate: z.string().optional().default(""),
  startsAt: z.string().optional().default(""),
  mediaUrl: z.string().trim().max(2000).optional().default(""),
  thumbnailUrl: z.string().trim().max(2000).optional().default(""),
  secondaryUrl: z.string().trim().max(2000).optional().default(""),
  resourceType: z.string().trim().max(40).optional().default("file"),
  instructor: z.string().trim().max(160).optional().default("")
});

const tableFor: Record<ContentType, string> = {
  episodes: "episodes",
  courses: "courses",
  events: "events",
  resources: "resources",
  community: "community_spaces"
};
const featureFor: Record<ContentType, string> = {
  episodes: "podcasts",
  courses: "courses",
  events: "events",
  resources: "resources",
  community: "community"
};

async function isEnabled(context: NonNullable<Awaited<ReturnType<typeof getActiveTenantManager>>>, type: ContentType) {
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  return entitlements.get(featureFor[type]) === true;
}

function validType(value: string): value is ContentType {
  return contentTypes.includes(value as ContentType);
}

function canManageType(role: string, type: ContentType) {
  if (["tenant_owner", "tenant_admin", "content_manager", "contributor"].includes(role)) return true;
  if (type === "courses") return role === "course_manager";
  if (type === "events") return role === "event_manager";
  if (type === "community") return ["community_manager", "community_moderator"].includes(role);
  return false;
}

async function canManageScopedType(context: NonNullable<Awaited<ReturnType<typeof getActiveTenantManager>>>, type: ContentType) {
  if (type !== "events" && type !== "resources") return canManageType(context.role, type);
  const permitted = await getActiveTenantWithPermission(type === "events" ? "tenant.events.manage" : "tenant.resources.manage");
  return permitted?.tenant.id === context.tenant.id;
}

function slugify(value: string) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "content"}-${randomUUID().slice(0, 8)}`;
}

function contentErrorMessage(message: string) {
  if (/content_url/i.test(message) && /column|schema cache|relation/i.test(message)) {
    return "The thumbnail database upgrade is not installed. Run supabase/migrations/0005_content_covers.sql in the Supabase SQL Editor, then try again.";
  }
  if (/video_url|cover_image_url|location_url|resources/i.test(message) && /column|schema cache|relation/i.test(message)) {
    return "The content database upgrade is not installed. Run migrations 0004 and 0005 in the Supabase SQL Editor, then try again.";
  }
  return message;
}

function protectedAssetId(value: string) { const match = value.match(/(?:^|\/api\/media\/)([0-9a-f]{8}-[0-9a-f-]{27,})$/i); return match?.[1]; }

async function bindProtectedAssets(tenantId: string, type: ContentType, contentId: string, accessLevel: string, fields: Array<{ value: string; role: string }>) {
  const admin = createAdminClient(); const selected = fields.map((field) => ({ id: protectedAssetId(field.value), role: field.role })).filter((field): field is { id: string; role: string } => Boolean(field.id)); const { data: current } = await admin.from("protected_media_assets").select("id").eq("tenant_id", tenantId).eq("content_type", type).eq("content_id", contentId).in("status", ["pending", "active"]);
  for (const asset of current ?? []) if (!selected.some((item) => item.id === asset.id)) await admin.from("protected_media_assets").update({ status: "retired", updated_at: new Date().toISOString() }).eq("id", asset.id).eq("tenant_id", tenantId);
  for (const asset of selected) { const { error } = await admin.from("protected_media_assets").update({ content_type: type, content_id: contentId, access_level: accessLevel, asset_role: asset.role, status: "active", updated_at: new Date().toISOString() }).eq("id", asset.id).eq("tenant_id", tenantId); if (error) throw error; }
}

async function ensurePodcast(
  supabase: Awaited<ReturnType<typeof getActiveTenantManager>> extends infer T
    ? T extends { supabase: infer S } ? S : never
    : never,
  tenant: { id: string; name: string; slug: string }
) {
  const { data: existing } = await supabase
    .from("podcasts")
    .select("id")
    .eq("tenant_id", tenant.id)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase.from("podcasts").insert({
    tenant_id: tenant.id,
    title: `${tenant.name} Podcast`,
    slug: `${tenant.slug}-podcast`,
    description: "",
    status: "published",
    is_public: true,
    updated_at: new Date().toISOString()
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function courseHasPublishedLesson(
  context: NonNullable<Awaited<ReturnType<typeof getActiveTenantManager>>>,
  courseId: string
) {
  const { data: modules } = await context.supabase
    .from("course_modules")
    .select("id")
    .eq("tenant_id", context.tenant.id)
    .eq("course_id", courseId);
  const moduleIds = (modules ?? []).map((module: { id: string }) => module.id);
  if (!moduleIds.length) return false;
  const { count } = await context.supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", context.tenant.id)
    .in("module_id", moduleIds)
    .eq("status", "published");
  return Boolean(count);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!validType(type)) return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  if (!(await canManageScopedType(context, type))) return NextResponse.json({ error: "Your tenant role cannot manage this content type." }, { status: 403 });
  if (!(await isEnabled(context, type))) return NextResponse.json({ error: "This content feature is not enabled." }, { status: 403 });

  const titleField = type === "community" ? "name" : "title";
  const { data, error } = await context.supabase
    .from(tableFor[type])
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: contentErrorMessage(error.message) }, { status: 500 });
  let items: Record<string, unknown>[] = (data ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    title: item[titleField]
  }));
  if (type === "courses" && items.length) {
    const courseIds = items.map((item) => String(item.id));
    const [{ data: modules }, { data: materials }, { data: quizzes }, { data: enrollments }] = await Promise.all([
      context.supabase.from("course_modules").select("id,course_id").in("course_id", courseIds),
      context.supabase.from("course_materials").select("id,course_id").in("course_id", courseIds),
      context.supabase.from("course_quizzes").select("id,course_id").in("course_id", courseIds),
      context.supabase.from("course_enrollments").select("id,course_id,completed_at").in("course_id", courseIds)
    ]);
    const moduleIds = (modules ?? []).map((module) => module.id);
    const { data: lessons } = moduleIds.length ? await context.supabase.from("lessons").select("id,module_id").in("module_id", moduleIds) : { data: [] };
    items = items.map((item) => {
      const id = String(item.id);
      const ownedModules = (modules ?? []).filter((module) => module.course_id === id);
      const ownedModuleIds = new Set(ownedModules.map((module) => module.id));
      const ownedEnrollments = (enrollments ?? []).filter((enrollment) => enrollment.course_id === id);
      return { ...item, module_count: ownedModules.length, lesson_count: (lessons ?? []).filter((lesson) => ownedModuleIds.has(lesson.module_id)).length, material_count: (materials ?? []).filter((material) => material.course_id === id).length, quiz_count: (quizzes ?? []).filter((quiz) => quiz.course_id === id).length, enrollment_count: ownedEnrollments.length, completion_count: ownedEnrollments.filter((enrollment) => enrollment.completed_at).length };
    });
  }
  return NextResponse.json({ items, tenant: context.tenant });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!validType(type)) return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the required fields." }, { status: 400 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  if (!(await canManageScopedType(context, type))) return NextResponse.json({ error: "Your tenant role cannot manage this content type." }, { status: 403 });
  if (!(await isEnabled(context, type))) return NextResponse.json({ error: "This content feature is not enabled." }, { status: 403 });

  const input = parsed.data;
  if (input.status === "published") {
    if (type === "episodes" && !input.mediaUrl && !input.secondaryUrl) {
      return NextResponse.json({ error: "Add audio or video before publishing an episode." }, { status: 400 });
    }
    if (type === "courses" && !input.mediaUrl && (!input.id || !(await courseHasPublishedLesson(context, input.id)))) {
      return NextResponse.json({ error: "Add a course file or at least one published lesson before publishing." }, { status: 400 });
    }
    if (type === "resources" && !input.mediaUrl) {
      return NextResponse.json({ error: "Add a resource file before publishing." }, { status: 400 });
    }
  }
  const now = new Date().toISOString();
  let values: Record<string, unknown> = {
    tenant_id: context.tenant.id,
    description: input.description,
    status: input.status,
    updated_at: now
  };

  if (type === "episodes") {
    values = {
      ...values,
      podcast_id: await ensurePodcast(context.supabase, context.tenant),
      title: input.title,
      slug: slugify(input.title),
      access_level: input.accessLevel,
      publish_date: input.publishDate || null,
      audio_url: input.mediaUrl || null,
      video_url: input.secondaryUrl || null,
      cover_image_url: input.thumbnailUrl || null
    };
  } else if (type === "courses") {
    values = {
      ...values,
      title: input.title,
      slug: slugify(input.title),
      access_level: input.accessLevel,
      publish_date: input.publishDate || null,
      content_url: input.mediaUrl || null,
      cover_image_url: input.thumbnailUrl || null,
      instructor: input.instructor || null
    };
  } else if (type === "events") {
    values = {
      ...values,
      title: input.title,
      slug: slugify(input.title),
      access_level: input.accessLevel,
      starts_at: input.startsAt || input.publishDate || now,
      publish_date: input.publishDate || null,
      location_url: input.mediaUrl || null,
      cover_image_url: input.thumbnailUrl || null
    };
  } else if (type === "resources") {
    values = {
      ...values,
      title: input.title,
      slug: slugify(input.title),
      access_level: input.accessLevel,
      resource_type: input.resourceType,
      url: input.mediaUrl,
      cover_image_url: input.thumbnailUrl || null
    };
  } else {
    values = {
      ...values,
      name: input.title,
      slug: slugify(input.title),
      access_level: input.accessLevel
    };
  }

  const query = context.supabase.from(tableFor[type]);
  const result = input.id
    ? await query.update({ ...values, slug: undefined, tenant_id: undefined }).eq("id", input.id).eq("tenant_id", context.tenant.id).select("*").single()
    : await query.insert(values).select("*").single();

  if (result.error) return NextResponse.json({ error: contentErrorMessage(result.error.message) }, { status: 500 });
  try { await bindProtectedAssets(context.tenant.id, type, result.data.id, input.accessLevel, [{ value: input.mediaUrl, role: "content" }, { value: input.secondaryUrl, role: "secondary" }, { value: input.thumbnailUrl, role: "cover" }]); } catch (error) { return NextResponse.json({ error: /protected_media_assets|schema cache/i.test(error instanceof Error ? error.message : "") ? "Protected media migration 0034 is required." : "Content was saved, but protected media could not be bound." }, { status: 500 }); }
  return NextResponse.json({ item: result.data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!validType(type)) return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid item is required." }, { status: 400 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  if (!(await canManageScopedType(context, type))) return NextResponse.json({ error: "Your tenant role cannot manage this content type." }, { status: 403 });
  if (!(await isEnabled(context, type))) return NextResponse.json({ error: "This content feature is not enabled." }, { status: 403 });

  await createAdminClient().from("protected_media_assets").update({ status: "retired", updated_at: new Date().toISOString() }).eq("tenant_id", context.tenant.id).eq("content_type", type).eq("content_id", id);

  const { error } = await context.supabase
    .from(tableFor[type])
    .delete()
    .eq("id", id)
    .eq("tenant_id", context.tenant.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
