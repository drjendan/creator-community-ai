import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  contentType: z.enum(["all", "podcasts", "courses", "resources", "events", "ai_generations"]).default("all")
});

const settingsSchema = z.object({
  defaultAccessLevel: z.enum(["public", "member", "paid"]),
  requirePublishDate: z.boolean(),
  allowDownloads: z.boolean(),
  showDraftBadges: z.boolean()
});

function schemaError(message: string) {
  return /content_categories|tenant_content_settings|schema cache|relation/i.test(message)
    ? "Content configuration is not installed yet. Apply database migration 0015 and try again."
    : message;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  if (!["categories", "settings"].includes(resource)) return NextResponse.json({ error: "Unknown content configuration." }, { status: 404 });
  const context = await getActiveTenantWithPermission("tenant.content.manage");
  if (!context) return NextResponse.json({ error: "Content manager access is required." }, { status: 403 });

  if (resource === "categories") {
    const { data, error } = await context.supabase.from("content_categories").select("*").eq("tenant_id", context.tenant.id).order("name");
    if (error) return NextResponse.json({ error: schemaError(error.message) }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  const { data, error } = await context.supabase.from("tenant_content_settings").select("*").eq("tenant_id", context.tenant.id).maybeSingle();
  if (error) return NextResponse.json({ error: schemaError(error.message) }, { status: 500 });
  return NextResponse.json({
    settings: data ?? {
      default_access_level: "member",
      require_publish_date: false,
      allow_downloads: true,
      show_draft_badges: true
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const context = await getActiveTenantWithPermission("tenant.content.manage");
  if (!context) return NextResponse.json({ error: "Content manager access is required." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });

  if (resource === "categories") {
    const parsed = categorySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the category fields." }, { status: 400 });
    const input = parsed.data;
    const values = {
      tenant_id: context.tenant.id,
      name: input.name,
      description: input.description,
      content_type: input.contentType,
      updated_at: new Date().toISOString()
    };
    const query = context.supabase.from("content_categories");
    const result = input.id
      ? await query.update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).select("*").single()
      : await query.insert({ ...values, slug: slugify(input.name) }).select("*").single();
    if (result.error) return NextResponse.json({ error: schemaError(result.error.message) }, { status: 500 });
    return NextResponse.json({ item: result.data });
  }

  if (resource === "settings") {
    const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the content settings." }, { status: 400 });
    const input = parsed.data;
    const { data, error } = await context.supabase.from("tenant_content_settings").upsert({
      tenant_id: context.tenant.id,
      default_access_level: input.defaultAccessLevel,
      require_publish_date: input.requirePublishDate,
      allow_downloads: input.allowDownloads,
      show_draft_badges: input.showDraftBadges,
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id" }).select("*").single();
    if (error) return NextResponse.json({ error: schemaError(error.message) }, { status: 500 });
    return NextResponse.json({ settings: data });
  }

  return NextResponse.json({ error: "Unknown content configuration." }, { status: 404 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  if (resource !== "categories") return NextResponse.json({ error: "Unknown content configuration." }, { status: 404 });
  const context = await getActiveTenantWithPermission("tenant.content.manage");
  if (!context) return NextResponse.json({ error: "Content manager access is required." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid category is required." }, { status: 400 });
  const { error } = await context.supabase.from("content_categories").delete().eq("id", id).eq("tenant_id", context.tenant.id);
  if (error) return NextResponse.json({ error: schemaError(error.message) }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
