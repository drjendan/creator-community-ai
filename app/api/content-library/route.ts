import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission, getTenantPermissionSet } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";
import { createAdminClient } from "@/lib/supabase/admin";

const contentTypeSchema = z.enum(["episodes", "courses", "resources", "events", "ai_generations"]);
const assignmentSchema = z.object({
  contentType: contentTypeSchema,
  contentId: z.string().uuid(),
  categoryIds: z.array(z.string().uuid()).max(20)
});

function migrationError(message: string) {
  if (/ai_generations|current_version/i.test(message)) return "AI Studio workflow is not installed yet. Apply database migration 0023 and try again.";
  return /content_category_assignments|replace_content_category_assignments|schema cache|relation/i.test(message)
    ? "Content Library consolidation is not installed yet. Apply database migration 0021 and try again."
    : "Unable to load the Content Library.";
}

export async function GET() {
  const context = await getActiveTenantWithPermission("tenant.content.view");
  if (!context) return NextResponse.json({ error: "Content Library access is required." }, { status: 403 });
  const tenantId = context.tenant.id;
  const entitlements = await getTenantEntitlements(tenantId, context.supabase);
  const permissions = await getTenantPermissionSet(context.role);
  const queryClient = permissions.has("tenant.content.manage") ? createAdminClient() : context.supabase;
  const [episodes, courses, resources, events, aiGenerations, categories, assignments] = await Promise.all([
    queryClient.from("episodes").select("id,title,description,status,access_level,publish_date,updated_at,cover_image_url").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    queryClient.from("courses").select("id,title,description,status,access_level,publish_date,updated_at,cover_image_url").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    queryClient.from("resources").select("id,title,description,status,access_level,updated_at,cover_image_url,resource_type").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    queryClient.from("events").select("id,title,description,status,access_level,publish_date,starts_at,updated_at,cover_image_url").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    queryClient.from("ai_generations").select("id,source_title,output_type,output,status,updated_at,current_version").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    queryClient.from("content_categories").select("id,name,content_type").eq("tenant_id", tenantId).order("name"),
    queryClient.from("content_category_assignments").select("category_id,content_type,content_id").eq("tenant_id", tenantId)
  ]);
  const queryError = [episodes.error, courses.error, resources.error, events.error, aiGenerations.error, categories.error, assignments.error].find(Boolean);
  if (queryError) return NextResponse.json({ error: migrationError(queryError.message) }, { status: 500 });
  const assigned = new Map<string, string[]>();
  for (const row of assignments.data ?? []) {
    const key = `${row.content_type}:${row.content_id}`;
    assigned.set(key, [...(assigned.get(key) ?? []), row.category_id]);
  }
  const normalize = (type: "episodes" | "courses" | "resources" | "events", rows: Array<Record<string, unknown>>) =>
    rows.map((row) => ({ ...row, content_type: type, category_ids: assigned.get(`${type}:${row.id}`) ?? [] }));
  const aiItems = (aiGenerations.data ?? []).map((row) => ({
    id: row.id,
    title: `${String(row.output_type).replaceAll("_", " ")} · ${row.source_title || "Start from scratch"}`,
    description: Array.isArray(row.output) ? String(row.output[0] ?? "") : "",
    status: row.status,
    access_level: "workspace",
    updated_at: row.updated_at,
    current_version: row.current_version,
    content_type: "ai_generations" as const,
    category_ids: assigned.get(`ai_generations:${row.id}`) ?? []
  }));
  const items = [
    ...(entitlements.get("podcasts") ? normalize("episodes", (episodes.data ?? []) as Array<Record<string, unknown>>) : []),
    ...(entitlements.get("courses") ? normalize("courses", (courses.data ?? []) as Array<Record<string, unknown>>) : []),
    ...(entitlements.get("resources") ? normalize("resources", (resources.data ?? []) as Array<Record<string, unknown>>) : []),
    ...(entitlements.get("events") ? normalize("events", (events.data ?? []) as Array<Record<string, unknown>>) : []),
    ...(entitlements.get("creator_ai_studio") ? aiItems : [])
  ].sort((left, right) => String((right as Record<string, unknown>).updated_at).localeCompare(String((left as Record<string, unknown>).updated_at)));
  return NextResponse.json({ items, categories: categories.data ?? [], tenant: context.tenant, canManage: permissions.has("tenant.content.manage") });
}

export async function PATCH(request: NextRequest) {
  const context = await getActiveTenantWithPermission("tenant.content.manage");
  if (!context) return NextResponse.json({ error: "Content management permission is required." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select valid Content Library categories." }, { status: 400 });
  const { error } = await context.supabase.rpc("replace_content_category_assignments", {
    target_tenant: context.tenant.id,
    target_type: parsed.data.contentType,
    target_content: parsed.data.contentId,
    target_categories: parsed.data.categoryIds
  });
  if (error) return NextResponse.json({ error: migrationError(error.message) }, { status: 500 });
  await context.supabase.from("audit_logs").insert({
    tenant_id: context.tenant.id,
    user_id: context.user.id,
    action: "tenant.content.categories_changed",
    entity_type: parsed.data.contentType,
    entity_id: parsed.data.contentId,
    metadata: { category_ids: parsed.data.categoryIds }
  });
  return NextResponse.json({ categoryIds: parsed.data.categoryIds });
}
