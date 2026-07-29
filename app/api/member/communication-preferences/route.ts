import { NextRequest, NextResponse } from "next/server";
import { getTenantMemberContext } from "@/lib/communications/member-context";

const categories = ["announcements", "newsletters", "new_content", "event_reminders", "course_notifications", "membership_reminders", "community_summaries", "direct_messages", "weekly_digest", "all_marketing"];

export async function GET(request: NextRequest) {
  const context = await getTenantMemberContext(request.nextUrl.searchParams.get("tenantSlug") ?? "");
  if (!context) return NextResponse.json({ error: "Active tenant membership is required." }, { status: 403 });
  const { data } = await context.supabase.from("member_communication_preferences").select("category,email_enabled,consent_source,consented_at,unsubscribed_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id);
  return NextResponse.json({ preferences: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { tenantSlug?: string; preferences?: Record<string, boolean> } | null;
  const context = await getTenantMemberContext(body?.tenantSlug ?? "");
  if (!context) return NextResponse.json({ error: "Active tenant membership is required." }, { status: 403 });
  const entries = Object.entries(body?.preferences ?? {}).filter(([category]) => categories.includes(category));
  const now = new Date().toISOString();
  const rows = entries.map(([category, enabled]) => ({
    tenant_id: context.tenant.id, user_id: context.user.id, category, email_enabled: Boolean(enabled),
    consent_source: "member_preferences", consented_at: enabled ? now : null, unsubscribed_at: enabled ? null : now, updated_at: now
  }));
  const { error } = await context.supabase.from("member_communication_preferences").upsert(rows, { onConflict: "tenant_id,user_id,category" });
  if (error) return NextResponse.json({ error: "Unable to save communication preferences." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
