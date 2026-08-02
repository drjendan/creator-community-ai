import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantMemberContext } from "@/lib/communications/member-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialMutationError } from "@/lib/trials";

const base = z.object({ tenantSlug: z.string().trim().min(1).max(120) });
const schema = z.union([
  base.extend({ action: z.literal("post"), spaceId: z.string().uuid(), title: z.string().trim().min(2).max(180), body: z.string().trim().min(2).max(10000) }),
  base.extend({ action: z.literal("comment"), postId: z.string().uuid(), body: z.string().trim().min(1).max(5000) }),
  base.extend({ action: z.literal("reaction"), postId: z.string().uuid().optional(), commentId: z.string().uuid().optional(), reaction: z.enum(["like","celebrate","support","insightful"]) }).refine((value) => Boolean(value.postId) !== Boolean(value.commentId)),
  base.extend({ action: z.literal("report"), postId: z.string().uuid().optional(), commentId: z.string().uuid().optional(), reason: z.enum(["spam","harassment","unsafe","misinformation","other"]), details: z.string().trim().max(1000) }).refine((value) => Boolean(value.postId) !== Boolean(value.commentId)),
  base.extend({ action: z.literal("remove"), kind: z.enum(["post","comment"]), id: z.string().uuid() })
]);

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get("tenantSlug") ?? ""; const spaceId = request.nextUrl.searchParams.get("spaceId") ?? ""; const search = (request.nextUrl.searchParams.get("search") ?? "").trim().toLowerCase();
  if (!z.string().uuid().safeParse(spaceId).success) return NextResponse.json({ error: "A valid community space is required." }, { status: 400 });
  const context = await getTenantMemberContext(tenantSlug);
  if (!context) return NextResponse.json({ error: "Active organization membership is required." }, { status: 401 });
  const { data: space, error: spaceError } = await context.supabase.from("community_spaces").select("id,name,description,guidelines,posting_policy,access_level").eq("id", spaceId).eq("tenant_id", context.tenant.id).eq("status", "active").maybeSingle();
  if (spaceError && /guidelines|schema cache/i.test(spaceError.message)) return NextResponse.json({ error: "Community migration 0026 is required." }, { status: 503 });
  if (!space) return NextResponse.json({ error: "Community space not found or unavailable." }, { status: 404 });
  const { data: postRows, error } = await context.supabase.from("community_posts").select("id,user_id,title,body,is_pinned,is_locked,edited_at,created_at").eq("tenant_id", context.tenant.id).eq("space_id", spaceId).eq("status", "published").is("hidden_at", null).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: /is_pinned|schema cache/i.test(error.message) ? "Community migration 0026 is required." : "Unable to load discussions." }, { status: 500 });
  const filtered = (postRows ?? []).filter((post) => !search || `${post.title ?? ""} ${post.body}`.toLowerCase().includes(search));
  const postIds = filtered.map((post) => post.id);
  const [{ data: comments }, { data: reactions }] = postIds.length ? await Promise.all([
    context.supabase.from("community_comments").select("id,post_id,user_id,body,edited_at,created_at").eq("tenant_id", context.tenant.id).in("post_id", postIds).eq("status", "published").is("hidden_at", null).order("created_at"),
    context.supabase.from("community_reactions").select("id,post_id,comment_id,user_id,reaction").eq("tenant_id", context.tenant.id).in("post_id", postIds)
  ]) : [{ data: [] }, { data: [] }];
  const userIds = [...new Set([...filtered.map((post) => post.user_id), ...(comments ?? []).map((comment) => comment.user_id)])];
  const admin = createAdminClient(); const { data: profiles } = userIds.length ? await admin.from("profiles").select("id,full_name,avatar_url").in("id", userIds) : { data: [] };
  return NextResponse.json({ space, posts: filtered, comments: comments ?? [], reactions: reactions ?? [], profiles: profiles ?? [], currentUserId: context.user.id });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the community action fields." }, { status: 400 });
  const input = parsed.data; const context = await getTenantMemberContext(input.tenantSlug);
  if (!context) return NextResponse.json({ error: "Active organization membership is required." }, { status: 401 });
  const trialError = await trialMutationError(context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  if (input.action === "post") {
    const { data: space } = await context.supabase.from("community_spaces").select("id,posting_policy").eq("id", input.spaceId).eq("tenant_id", context.tenant.id).eq("status", "active").maybeSingle();
    if (!space) return NextResponse.json({ error: "Community space not found." }, { status: 404 });
    if (space.posting_policy !== "members") return NextResponse.json({ error: "Only community managers can start discussions in this space." }, { status: 403 });
    const { error } = await context.supabase.from("community_posts").insert({ tenant_id: context.tenant.id, space_id: input.spaceId, user_id: context.user.id, title: input.title, body: input.body, status: "published" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (input.action === "comment") {
    const { data: post } = await context.supabase.from("community_posts").select("id,is_locked").eq("id", input.postId).eq("tenant_id", context.tenant.id).eq("status", "published").maybeSingle();
    if (!post) return NextResponse.json({ error: "Discussion not found." }, { status: 404 });
    if (post.is_locked) return NextResponse.json({ error: "This discussion is locked." }, { status: 409 });
    const { error } = await context.supabase.from("community_comments").insert({ tenant_id: context.tenant.id, post_id: input.postId, user_id: context.user.id, body: input.body, status: "published" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (input.action === "reaction") {
    const target = input.postId ? { field: "post_id", id: input.postId } : { field: "comment_id", id: input.commentId! };
    const { data: existing } = await context.supabase.from("community_reactions").select("id").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id).eq(target.field, target.id).eq("reaction", input.reaction).maybeSingle();
    const result = existing ? await context.supabase.from("community_reactions").delete().eq("id", existing.id).eq("user_id", context.user.id) : await context.supabase.from("community_reactions").insert({ tenant_id: context.tenant.id, user_id: context.user.id, post_id: input.postId ?? null, comment_id: input.commentId ?? null, reaction: input.reaction });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  } else if (input.action === "report") {
    const { error } = await context.supabase.from("community_reports").insert({ tenant_id: context.tenant.id, reporter_id: context.user.id, post_id: input.postId ?? null, comment_id: input.commentId ?? null, reason: input.reason, details: input.details });
    if (error) return NextResponse.json({ error: /community_reports|schema cache/i.test(error.message) ? "Community migration 0026 is required." : error.message }, { status: 500 });
  } else {
    const table = input.kind === "post" ? "community_posts" : "community_comments";
    const admin = createAdminClient();
    const { data: owned } = await admin.from(table).select("id").eq("id", input.id).eq("tenant_id", context.tenant.id).eq("user_id", context.user.id).maybeSingle();
    if (!owned) return NextResponse.json({ error: "You can only remove your own contribution." }, { status: 403 });
    const { error } = await admin.from(table).update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", input.id).eq("tenant_id", context.tenant.id).eq("user_id", context.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
