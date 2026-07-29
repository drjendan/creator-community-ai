import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

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
  resourceType: z.string().trim().max(40).optional().default("file")
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
  if (["tenant_owner", "tenant_admin", "content_manager"].includes(role)) return true;
  if (type === "courses") return role === "course_manager";
  if (type === "events") return role === "event_manager";
  if (type === "community") return ["community_manager", "community_moderator"].includes(role);
  return false;
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!validType(type)) return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  if (!canManageType(context.role, type)) return NextResponse.json({ error: "Your tenant role cannot manage this content type." }, { status: 403 });
  if (!(await isEnabled(context, type))) return NextResponse.json({ error: "This content feature is not enabled." }, { status: 403 });

  const titleField = type === "community" ? "name" : "title";
  const { data, error } = await context.supabase
    .from(tableFor[type])
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: contentErrorMessage(error.message) }, { status: 500 });
  const items = (data ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    title: item[titleField]
  }));
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
  if (!canManageType(context.role, type)) return NextResponse.json({ error: "Your tenant role cannot manage this content type." }, { status: 403 });
  if (!(await isEnabled(context, type))) return NextResponse.json({ error: "This content feature is not enabled." }, { status: 403 });

  const input = parsed.data;
  if (input.status === "published") {
    if (type === "episodes" && !input.mediaUrl && !input.secondaryUrl) {
      return NextResponse.json({ error: "Add audio or video before publishing an episode." }, { status: 400 });
    }
    if ((type === "courses" || type === "resources") && !input.mediaUrl) {
      return NextResponse.json({ error: `Add a ${type === "courses" ? "course file" : "resource file"} before publishing.` }, { status: 400 });
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
      cover_image_url: input.thumbnailUrl || null
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
  if (!canManageType(context.role, type)) return NextResponse.json({ error: "Your tenant role cannot manage this content type." }, { status: 403 });
  if (!(await isEnabled(context, type))) return NextResponse.json({ error: "This content feature is not enabled." }, { status: 403 });

  const { error } = await context.supabase
    .from(tableFor[type])
    .delete()
    .eq("id", id)
    .eq("tenant_id", context.tenant.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
