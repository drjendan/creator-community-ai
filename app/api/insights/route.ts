import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantWithPermission, getTenantPermissionSet } from "@/lib/tenant-context";

type Insight = { insightKey: string; insightType: string; title: string; qualifiedSummary: string; supportingMetrics: Record<string, number>; confidence: number; severity: "info" | "opportunity" | "attention"; recommendedAction: string };
const schema = z.object({ id: z.string().uuid(), action: z.enum(["review", "dismiss", "reopen"]) });

export async function GET() {
  const context = await getActiveTenantWithPermission("tenant.analytics.view"); if (!context) return NextResponse.json({ error: "Analytics permission is required." }, { status: 403 });
  const admin = createAdminClient(); const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const [members, enrollments, progress, registrations, deliveries, posts] = await Promise.all([
    admin.from("tenant_memberships").select("id,lifecycle_stage,last_active_at,status").eq("tenant_id", context.tenant.id).in("role", ["member", "guest"]),
    admin.from("course_enrollments").select("id,status").eq("tenant_id", context.tenant.id),
    admin.from("lesson_progress").select("id,status,progress_percent").eq("tenant_id", context.tenant.id),
    admin.from("event_registrations").select("id,status").eq("tenant_id", context.tenant.id),
    admin.from("email_campaign_recipients").select("id,status").eq("tenant_id", context.tenant.id),
    admin.from("community_posts").select("id").eq("tenant_id", context.tenant.id).eq("status", "published").gte("created_at", cutoff)
  ]);
  const error = [members, enrollments, progress, registrations, deliveries, posts].find((result) => result.error)?.error;
  if (error) return NextResponse.json({ error: /lifecycle_stage|insight_key|schema cache/i.test(error.message) ? "Insight migration 0031 is required." : "Unable to calculate administrator insights." }, { status: 500 });
  const activeMembers = (members.data ?? []).filter((row) => row.status === "active"); const riskMembers = activeMembers.filter((row) => row.lifecycle_stage === "at_risk" || (row.last_active_at && row.last_active_at < cutoff));
  const lessonRows = progress.data ?? []; const completed = lessonRows.filter((row) => row.status === "completed" || row.progress_percent === 100).length;
  const deliveryRows = deliveries.data ?? []; const failed = deliveryRows.filter((row) => row.status === "failed").length;
  const attendanceRows = registrations.data ?? []; const noShows = attendanceRows.filter((row) => row.status === "no_show").length;
  const insights: Insight[] = [
    { insightKey: "audience-risk", insightType: "audience", title: "Audience follow-up signal", qualifiedSummary: `${riskMembers.length} of ${activeMembers.length} active audience members meet the configured at-risk or 30-day inactivity signal. This signal does not establish churn intent.`, supportingMetrics: { activeMembers: activeMembers.length, riskSignalMembers: riskMembers.length, inactivityWindowDays: 30 }, confidence: 1, severity: riskMembers.length ? "attention" : "info", recommendedAction: riskMembers.length ? "Review the matching member records before deciding whether personal outreach is appropriate." : "Continue monitoring member activity and lifecycle records." },
    { insightKey: "learning-completion", insightType: "learning", title: "Learning completion opportunity", qualifiedSummary: `${completed} of ${lessonRows.length} recorded lesson-progress rows are complete across ${enrollments.data?.length ?? 0} enrollments. This ratio reflects recorded progress only.`, supportingMetrics: { enrollments: enrollments.data?.length ?? 0, progressRecords: lessonRows.length, completedProgressRecords: completed }, confidence: 1, severity: lessonRows.length && completed / lessonRows.length < 0.5 ? "opportunity" : "info", recommendedAction: "Review course-level progress before changing curriculum or sending reminders." },
    { insightKey: "event-attendance", insightType: "events", title: "Event attendance signal", qualifiedSummary: `${noShows} no-show registrations are recorded among ${attendanceRows.length} event registrations. Registration status may be incomplete for recently held events.`, supportingMetrics: { registrations: attendanceRows.length, noShows }, confidence: 1, severity: noShows ? "opportunity" : "info", recommendedAction: "Verify event attendance records, then review reminders or scheduling for affected events." },
    { insightKey: "email-delivery", insightType: "communications", title: "Email delivery signal", qualifiedSummary: `${failed} of ${deliveryRows.length} recorded campaign recipients have failed status. This does not include messages without a recorded recipient outcome.`, supportingMetrics: { recordedRecipients: deliveryRows.length, failedRecipients: failed }, confidence: 1, severity: failed ? "attention" : "info", recommendedAction: "Review failure reasons and suppress invalid addresses before the next campaign." },
    { insightKey: "community-activity", insightType: "community", title: "Recent community activity", qualifiedSummary: `${posts.data?.length ?? 0} published community posts were recorded in the last 30 days. Post count alone does not measure member sentiment or engagement quality.`, supportingMetrics: { publishedPosts30d: posts.data?.length ?? 0, reportingWindowDays: 30 }, confidence: 1, severity: "info", recommendedAction: "Review the discussions themselves before planning community programming." }
  ];
  const { data: existing } = await admin.from("administrator_ai_insights").select("id,insight_key,status").eq("tenant_id", context.tenant.id); const byKey = new Map((existing ?? []).map((row) => [row.insight_key, row])); const now = new Date().toISOString();
  for (const item of insights) { const values = { insight_type: item.insightType, title: item.title, qualified_summary: item.qualifiedSummary, supporting_metrics: item.supportingMetrics, confidence: item.confidence, severity: item.severity, recommended_action: item.recommendedAction, updated_at: now, expires_at: new Date(Date.now() + 86400000).toISOString() }; const old = byKey.get(item.insightKey); if (old) await admin.from("administrator_ai_insights").update(values).eq("id", old.id).eq("tenant_id", context.tenant.id); else await admin.from("administrator_ai_insights").insert({ tenant_id: context.tenant.id, insight_key: item.insightKey, status: "active", ...values }); }
  const permissions = await getTenantPermissionSet(context.role); const { data: rows, error: readError } = await admin.from("administrator_ai_insights").select("id,insight_key,insight_type,title,qualified_summary,supporting_metrics,confidence,severity,recommended_action,status,reviewed_at,dismissed_at,updated_at").eq("tenant_id", context.tenant.id).order("updated_at", { ascending: false });
  if (readError) return NextResponse.json({ error: "Unable to load administrator insights." }, { status: 500 }); return NextResponse.json({ insights: rows ?? [], canManage: permissions.has("tenant.insights.manage"), generatedAt: now });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Choose a valid insight action." }, { status: 400 });
  const context = await getActiveTenantWithPermission("tenant.insights.manage"); if (!context) return NextResponse.json({ error: "Insight review permission is required." }, { status: 403 });
  const now = new Date().toISOString(); const values = parsed.data.action === "review" ? { status: "reviewed", reviewed_by: context.user.id, reviewed_at: now, dismissed_at: null, updated_at: now } : parsed.data.action === "dismiss" ? { status: "dismissed", dismissed_at: now, updated_at: now } : { status: "active", reviewed_by: null, reviewed_at: null, dismissed_at: null, updated_at: now };
  const admin = createAdminClient(); const { data, error } = await admin.from("administrator_ai_insights").update(values).eq("id", parsed.data.id).eq("tenant_id", context.tenant.id).select("id").maybeSingle(); if (error) return NextResponse.json({ error: "Unable to update the insight." }, { status: 500 }); if (!data) return NextResponse.json({ error: "Insight not found." }, { status: 404 }); await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: `tenant.insight.${parsed.data.action}`, entity_type: "administrator_ai_insight", entity_id: data.id, metadata: {} }); return NextResponse.json({ saved: true });
}
