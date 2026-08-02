/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantMemberContext } from "@/lib/communications/member-context";

type Candidate = { contentType: "episode" | "course" | "event" | "resource" | "community_space"; contentId: string; title: string; reason: string; explanation: string; score: number; href: string; signals: Record<string, unknown> };

const actionSchema = z.object({ tenantSlug: z.string().trim().min(1).max(120), id: z.string().uuid(), action: z.enum(["dismiss", "complete", "feedback"]), feedback: z.enum(["helpful", "not_helpful"]).optional() }).refine((value) => value.action !== "feedback" || value.feedback, { message: "Choose a feedback value." });

function candidate(contentType: Candidate["contentType"], row: Record<string, any>, slug: string, base: number, reason: string, explanation: string): Candidate {
  const href = contentType === "episode" ? `/demo/${slug}/episodes/${row.id}` : contentType === "course" ? `/demo/${slug}/courses/${row.id}` : contentType === "resource" ? `/demo/${slug}/resources/${row.id}` : contentType === "community_space" ? `/demo/${slug}/community/${row.id}` : `/demo/${slug}/events`;
  const featured = row.featured === true;
  return { contentType, contentId: row.id, title: row.title ?? row.name, reason, explanation, score: base + (featured ? 5 : 0), href, signals: { featured, source: "accessible_content", method: "deterministic_rules" } };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenantSlug") ?? "";
  const context = await getTenantMemberContext(slug);
  if (!context) return NextResponse.json({ error: "Member access is required." }, { status: 403 });
  const now = new Date().toISOString();
  const [episodes, courses, events, resources, spaces, enrollments, registrations, prior] = await Promise.all([
    context.supabase.from("episodes").select("id,title,featured,publish_date").eq("tenant_id", context.tenant.id).eq("status", "published").order("publish_date", { ascending: false, nullsFirst: false }).limit(8),
    context.supabase.from("courses").select("id,title,featured,publish_date").eq("tenant_id", context.tenant.id).eq("status", "published").order("publish_date", { ascending: false, nullsFirst: false }).limit(8),
    context.supabase.from("events").select("id,title,featured,starts_at").eq("tenant_id", context.tenant.id).eq("status", "published").gte("starts_at", now).order("starts_at").limit(8),
    context.supabase.from("resources").select("id,title,featured,publish_date").eq("tenant_id", context.tenant.id).eq("status", "published").order("publish_date", { ascending: false, nullsFirst: false }).limit(8),
    context.supabase.from("community_spaces").select("id,name,featured,created_at").eq("tenant_id", context.tenant.id).eq("status", "active").order("created_at", { ascending: false }).limit(8),
    context.supabase.from("course_enrollments").select("course_id,status").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("event_registrations").select("event_id,status").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("member_recommendations").select("id,content_type,content_id,status,feedback").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id)
  ]);
  const readError = [episodes, courses, events, resources, spaces, enrollments, registrations, prior].find((result) => result.error)?.error;
  if (readError) return NextResponse.json({ error: /member_recommendations|content_type|schema cache/i.test(readError.message) ? "Recommendation migration 0031 is required." : "Unable to build recommendations." }, { status: 500 });
  const enrolled = new Map((enrollments.data ?? []).map((row) => [row.course_id, row.status]));
  const registered = new Set((registrations.data ?? []).filter((row) => row.status !== "cancelled").map((row) => row.event_id));
  const candidates: Candidate[] = [
    ...(courses.data ?? []).map((row) => candidate("course", row, slug, enrolled.has(row.id) ? 100 : 70, enrolled.has(row.id) ? "Continue a course you joined" : "A recently available course", enrolled.has(row.id) ? "You are enrolled in this course, so it is ranked first for easy continuation." : "This published course is available through your current access.")),
    ...(events.data ?? []).map((row) => candidate("event", row, slug, registered.has(row.id) ? 88 : 68, registered.has(row.id) ? "An event you registered for" : "An upcoming event", registered.has(row.id) ? "Your registration makes this upcoming event especially relevant." : "This upcoming published event is available through your current access.")),
    ...(episodes.data ?? []).map((row) => candidate("episode", row, slug, 60, "Recent episode", "This recently published episode is available through your current access.")),
    ...(resources.data ?? []).map((row) => candidate("resource", row, slug, 55, "Recent resource", "This recently published resource is available through your current access.")),
    ...(spaces.data ?? []).map((row) => candidate("community_space", row, slug, 50, "Active community space", "This active space is available through your current access."))
  ].sort((a, b) => b.score - a.score).filter((item, index, all) => all.findIndex((other) => other.contentType === item.contentType && other.contentId === item.contentId) === index).slice(0, 8);
  const admin = createAdminClient(); const existing = new Map((prior.data ?? []).map((row) => [`${row.content_type}:${row.content_id}`, row])); const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
  for (const [rank, item] of candidates.entries()) {
    const old = existing.get(`${item.contentType}:${item.contentId}`); const values = { recommendation_type: "content", title: item.title, reason: item.reason, explanation: item.explanation, score: item.score, rank: rank + 1, signals: item.signals, source: "rules", expires_at: expiresAt, updated_at: now };
    if (old) await admin.from("member_recommendations").update(values).eq("id", old.id).eq("tenant_id", context.tenant.id).eq("user_id", context.user.id);
    else await admin.from("member_recommendations").insert({ tenant_id: context.tenant.id, user_id: context.user.id, content_type: item.contentType, content_id: item.contentId, status: "active", ...values });
  }
  const { data: saved } = await context.supabase.from("member_recommendations").select("id,content_type,content_id,status").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id);
  const savedByContent = new Map((saved ?? []).map((row) => [`${row.content_type}:${row.content_id}`, row]));
  return NextResponse.json({ recommendations: candidates.map((item) => ({ ...item, id: savedByContent.get(`${item.contentType}:${item.contentId}`)?.id, status: savedByContent.get(`${item.contentType}:${item.contentId}`)?.status })).filter((item) => item.id && item.status === "active").slice(0, 5) });
}

export async function POST(request: NextRequest) {
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the recommendation action." }, { status: 400 });
  const context = await getTenantMemberContext(parsed.data.tenantSlug); if (!context) return NextResponse.json({ error: "Member access is required." }, { status: 403 });
  const now = new Date().toISOString(); const update = parsed.data.action === "dismiss" ? { status: "dismissed", dismissed_at: now, updated_at: now } : parsed.data.action === "complete" ? { status: "completed", completed_at: now, updated_at: now } : { feedback: parsed.data.feedback, updated_at: now };
  const { data, error } = await createAdminClient().from("member_recommendations").update(update).eq("id", parsed.data.id).eq("tenant_id", context.tenant.id).eq("user_id", context.user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: /feedback|dismissed_at|schema cache/i.test(error.message) ? "Recommendation migration 0031 is required." : "Unable to update the recommendation." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
  return NextResponse.json({ saved: true });
}
