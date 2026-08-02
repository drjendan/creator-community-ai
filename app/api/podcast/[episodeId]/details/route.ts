import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("metadata"), showNotes: z.string().trim().max(30000), keyTakeaways: z.array(z.string().trim().min(1).max(500)).max(30), reflectionQuestions: z.array(z.string().trim().min(1).max(500)).max(30), durationSeconds: z.number().int().min(1).max(86400).nullable(), seasonNumber: z.number().int().min(1).max(10000).nullable(), episodeNumber: z.number().int().min(1).max(100000).nullable(), featured: z.boolean() }),
  z.object({ kind: z.literal("transcript"), content: z.string().trim().max(250000), language: z.string().trim().min(2).max(12), status: z.enum(["draft","published"]), allowDownload: z.boolean() }),
  z.object({ kind: z.literal("resource"), id: z.string().uuid().optional(), title: z.string().trim().min(2).max(180), description: z.string().trim().max(2000), url: z.string().trim().url().max(2000), resourceType: z.enum(["link","download","worksheet","transcript","book","article","video","audio"]), allowDownload: z.boolean(), sortOrder: z.number().int().min(0).max(10000) }),
  z.object({ kind: z.literal("tags"), tags: z.array(z.string().trim().min(1).max(50)).max(30) })
]);

async function authorize(episodeId: string) {
  const context = await getActiveTenantWithPermission("tenant.podcasts.manage"); if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase); if (entitlements.get("podcasts") !== true) return null;
  const admin = createAdminClient(); const { data: episode } = await admin.from("episodes").select("*").eq("id", episodeId).eq("tenant_id", context.tenant.id).maybeSingle();
  return episode ? { context, admin, episode } : null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params; if (!z.string().uuid().safeParse(episodeId).success) return NextResponse.json({ error: "A valid episode is required." }, { status: 400 });
  const authorized = await authorize(episodeId); if (!authorized) return NextResponse.json({ error: "Podcast management permission is required." }, { status: 403 });
  const { admin, context, episode } = authorized;
  const [transcriptResult, resourceResult, tagResult] = await Promise.all([
    admin.from("episode_transcripts").select("*").eq("tenant_id", context.tenant.id).eq("episode_id", episodeId).order("updated_at", { ascending: false }).limit(1),
    admin.from("episode_resources").select("*").eq("tenant_id", context.tenant.id).eq("episode_id", episodeId).order("sort_order"),
    admin.from("episode_tags").select("id,tag").eq("tenant_id", context.tenant.id).eq("episode_id", episodeId).order("tag")
  ]);
  const readError = transcriptResult.error ?? resourceResult.error ?? tagResult.error;
  if (readError) return NextResponse.json({ error: /language|description|sort_order|schema cache/i.test(readError.message) ? "Podcast migration 0027 is required." : "Unable to load episode details." }, { status: 500 });
  const transcripts = transcriptResult.data; const resources = resourceResult.data; const tags = tagResult.data;
  return NextResponse.json({ episode, transcript: transcripts?.[0] ?? null, resources: resources ?? [], tags: (tags ?? []).map((row) => row.tag) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check the podcast detail fields." }, { status: 400 });
  const authorized = await authorize(episodeId); if (!authorized) return NextResponse.json({ error: "Podcast management permission is required." }, { status: 403 });
  const { admin, context } = authorized; const trialError = await trialMutationError(context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const input = parsed.data; const now = new Date().toISOString(); let error: { message: string } | null = null;
  if (input.kind === "transcript" && input.status === "published" && !input.content) return NextResponse.json({ error: "Add transcript text before publishing it." }, { status: 400 });
  if (input.kind === "metadata") {
    ({ error } = await admin.from("episodes").update({ show_notes: input.showNotes, key_takeaways: input.keyTakeaways, reflection_questions: input.reflectionQuestions, duration_seconds: input.durationSeconds, season_number: input.seasonNumber, episode_number: input.episodeNumber, featured: input.featured, updated_at: now }).eq("id", episodeId).eq("tenant_id", context.tenant.id));
  } else if (input.kind === "transcript") {
    const { data: existing } = await admin.from("episode_transcripts").select("id").eq("tenant_id", context.tenant.id).eq("episode_id", episodeId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const values = { tenant_id: context.tenant.id, episode_id: episodeId, content: input.content, language: input.language.toLowerCase(), status: input.status, allow_download: input.allowDownload, updated_at: now };
    ({ error } = existing ? await admin.from("episode_transcripts").update(values).eq("id", existing.id).eq("tenant_id", context.tenant.id) : await admin.from("episode_transcripts").insert(values));
  } else if (input.kind === "resource") {
    const values = { tenant_id: context.tenant.id, episode_id: episodeId, title: input.title, description: input.description, url: input.url, resource_type: input.resourceType, allow_download: input.allowDownload, sort_order: input.sortOrder, updated_at: now };
    ({ error } = input.id ? await admin.from("episode_resources").update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).eq("episode_id", episodeId) : await admin.from("episode_resources").insert(values));
  } else {
    const tags = [...new Set(input.tags.map((tag) => tag.toLowerCase()))];
    const removed = await admin.from("episode_tags").delete().eq("tenant_id", context.tenant.id).eq("episode_id", episodeId); error = removed.error;
    if (!error && tags.length) ({ error } = await admin.from("episode_tags").insert(tags.map((tag) => ({ tenant_id: context.tenant.id, episode_id: episodeId, tag }))));
  }
  if (error) return NextResponse.json({ error: /show_notes|language|resource_type|schema cache/i.test(error.message) ? "Podcast migration 0027 is required." : "Unable to save episode details." }, { status: 500 });
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: `tenant.podcast.${input.kind}_saved`, entity_type: "episode", entity_id: episodeId });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params; const id = request.nextUrl.searchParams.get("resourceId"); if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid resource is required." }, { status: 400 });
  const authorized = await authorize(episodeId); if (!authorized) return NextResponse.json({ error: "Podcast management permission is required." }, { status: 403 });
  const trialError = await trialMutationError(authorized.context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const { error } = await authorized.admin.from("episode_resources").delete().eq("id", id).eq("tenant_id", authorized.context.tenant.id).eq("episode_id", episodeId);
  if (error) return NextResponse.json({ error: "Unable to remove the resource." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
