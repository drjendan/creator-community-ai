import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("post"), id: z.string().uuid(), operation: z.enum(["pin","unpin","lock","unlock","hide","restore"]), reason: z.string().trim().max(500).default("") }),
  z.object({ action: z.literal("comment"), id: z.string().uuid(), operation: z.enum(["hide","restore"]), reason: z.string().trim().max(500).default("") }),
  z.object({ action: z.literal("report"), id: z.string().uuid(), status: z.enum(["reviewed","dismissed","actioned"]) }),
  z.object({ action: z.literal("space"), id: z.string().uuid(), guidelines: z.string().trim().max(5000), postingPolicy: z.enum(["members","managers"]), featured: z.boolean(), sortOrder: z.number().int().min(0).max(10000) })
]);

async function authorize() { return getActiveTenantWithPermission("tenant.community.manage"); }

export async function GET() {
  const context = await authorize(); if (!context) return NextResponse.json({ error: "Community moderation permission is required." }, { status: 403 });
  const admin = createAdminClient();
  const [{ data: spaces, error }, { data: posts }, { data: comments }, { data: reports }] = await Promise.all([
    admin.from("community_spaces").select("id,name,guidelines,posting_policy,featured,sort_order,status").eq("tenant_id", context.tenant.id).order("sort_order"),
    admin.from("community_posts").select("id,space_id,user_id,title,body,status,is_pinned,is_locked,hidden_at,moderation_reason,created_at").eq("tenant_id", context.tenant.id).order("created_at", { ascending: false }).limit(100),
    admin.from("community_comments").select("id,post_id,user_id,body,status,hidden_at,moderation_reason,created_at").eq("tenant_id", context.tenant.id).order("created_at", { ascending: false }).limit(100),
    admin.from("community_reports").select("id,reporter_id,post_id,comment_id,reason,details,status,created_at").eq("tenant_id", context.tenant.id).order("created_at", { ascending: false }).limit(100)
  ]);
  if (error && /guidelines|schema cache/i.test(error.message)) return NextResponse.json({ error: "Community migration 0026 is required." }, { status: 503 });
  return NextResponse.json({ spaces: spaces ?? [], posts: posts ?? [], comments: comments ?? [], reports: reports ?? [] });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Choose a valid moderation action." }, { status: 400 });
  const context = await authorize(); if (!context) return NextResponse.json({ error: "Community moderation permission is required." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const admin = createAdminClient(); const input = parsed.data; const now = new Date().toISOString(); let error: { message: string } | null = null;
  if (input.action === "post") {
    const values = input.operation === "pin" ? { is_pinned: true } : input.operation === "unpin" ? { is_pinned: false } : input.operation === "lock" ? { is_locked: true } : input.operation === "unlock" ? { is_locked: false } : input.operation === "hide" ? { status: "hidden", hidden_at: now, hidden_by: context.user.id, moderation_reason: input.reason || "Moderator action" } : { status: "published", hidden_at: null, hidden_by: null, moderation_reason: null };
    ({ error } = await admin.from("community_posts").update({ ...values, updated_at: now }).eq("id", input.id).eq("tenant_id", context.tenant.id));
  } else if (input.action === "comment") {
    const values = input.operation === "hide" ? { status: "hidden", hidden_at: now, hidden_by: context.user.id, moderation_reason: input.reason || "Moderator action" } : { status: "published", hidden_at: null, hidden_by: null, moderation_reason: null };
    ({ error } = await admin.from("community_comments").update({ ...values, updated_at: now }).eq("id", input.id).eq("tenant_id", context.tenant.id));
  } else if (input.action === "report") {
    ({ error } = await admin.from("community_reports").update({ status: input.status, resolved_by: context.user.id, resolved_at: now }).eq("id", input.id).eq("tenant_id", context.tenant.id));
  } else {
    ({ error } = await admin.from("community_spaces").update({ guidelines: input.guidelines, posting_policy: input.postingPolicy, featured: input.featured, sort_order: input.sortOrder, updated_at: now }).eq("id", input.id).eq("tenant_id", context.tenant.id));
  }
  if (error) return NextResponse.json({ error: /community_reports|is_pinned|guidelines|schema cache/i.test(error.message) ? "Community migration 0026 is required." : "Unable to apply the moderation action." }, { status: 500 });
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: `tenant.community.${input.action}_moderated`, entity_type: `community_${input.action}`, entity_id: input.id, metadata: input });
  return NextResponse.json({ saved: true });
}
