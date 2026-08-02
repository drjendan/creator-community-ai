import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantMemberContext } from "@/lib/communications/member-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit, rateLimitError } from "@/lib/rate-limit";

const schema = z.object({ tenantSlug: z.string().trim().min(1).max(120), requestType: z.enum(["correction", "closure"]), details: z.string().trim().min(10).max(5000) });

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("tenantSlug") ?? ""; const context = await getTenantMemberContext(slug);
  if (!context) return NextResponse.json({ error: "Member access is required." }, { status: 403 });
  if (request.nextUrl.searchParams.get("download") !== "personal") {
    const { data, error } = await context.supabase.from("data_rights_requests").select("id,request_type,status,request_details,resolution_notes,resolved_at,created_at").eq("tenant_id", context.tenant.id).eq("subject_user_id", context.user.id).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: /data_rights_requests|schema cache/i.test(error.message) ? "Data governance migration 0032 is required." : "Unable to load data requests." }, { status: 500 });
    return NextResponse.json({ requests: data ?? [] });
  }
  const admin = createAdminClient(); const since = new Date(Date.now() - 86400000).toISOString(); const { count } = await admin.from("data_rights_requests").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenant.id).eq("subject_user_id", context.user.id).eq("request_type", "export").gte("created_at", since);
  if (Number(count ?? 0) >= 5) return NextResponse.json({ error: "Daily personal-export limit reached. Try again later." }, { status: 429 });
  const queries = await Promise.all([
    context.supabase.from("profiles").select("full_name,avatar_url,created_at,updated_at").eq("id", context.user.id),
    context.supabase.from("tenant_memberships").select("role,status,created_at,joined_at,last_active_at,audience_source,lifecycle_stage").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("tenant_member_profiles").select("preferred_name,job_title,organization,phone,location,timezone,bio,custom_fields,created_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("member_subscriptions").select("status,starts_at,renewal_at,current_period_end,assignment_type,created_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("course_enrollments").select("course_id,status,enrolled_at,created_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("lesson_progress").select("lesson_id,status,progress_percent,completed_at,created_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("event_registrations").select("event_id,status,created_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("resource_bookmarks").select("resource_id,created_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("member_recommendations").select("content_type,content_id,title,reason,explanation,feedback,status,created_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id),
    context.supabase.from("member_communication_preferences").select("category,email_enabled,consent_source,consented_at,unsubscribed_at,updated_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id)
  ]);
  const names = ["profile", "membership", "tenantProfile", "subscriptions", "courseEnrollments", "lessonProgress", "eventRegistrations", "resourceBookmarks", "recommendations", "communicationPreferences"];
  const sections = Object.fromEntries(queries.map((result, index) => [names[index], { records: result.data ?? [], included: !result.error }])); const generatedAt = new Date().toISOString();
  await admin.from("data_rights_requests").insert({ tenant_id: context.tenant.id, subject_user_id: context.user.id, requested_by: context.user.id, request_type: "export", status: "completed", request_details: "Member-generated personal data export.", resolution_notes: "Generated automatically from member-readable tenant records.", resolved_by: context.user.id, resolved_at: generatedAt });
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: "member.data.exported", entity_type: "user", entity_id: context.user.id, metadata: { sections: names } });
  const body = JSON.stringify({ generatedAt, tenant: { id: context.tenant.id, name: context.tenant.name, slug: context.tenant.slug }, account: { id: context.user.id, email: context.user.email, createdAt: context.user.created_at }, sections }, null, 2);
  return new NextResponse(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${context.tenant.slug}-personal-data.json"`, "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the request details." }, { status: 400 });
  const context = await getTenantMemberContext(parsed.data.tenantSlug); if (!context) return NextResponse.json({ error: "Member access is required." }, { status: 403 });
  const limit = await enforceRateLimit({ request, scope: "member.data.request", limit: 5, windowSeconds: 86400, tenantId: context.tenant.id, userId: context.user.id }); if (!limit.allowed) { const failure = rateLimitError(limit); return NextResponse.json({ error: failure.error }, { status: failure.status, headers: failure.headers }); }
  const admin = createAdminClient(); const since = new Date(Date.now() - 86400000).toISOString(); const { count } = await admin.from("data_rights_requests").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenant.id).eq("subject_user_id", context.user.id).gte("created_at", since);
  if (Number(count ?? 0) >= 5) return NextResponse.json({ error: "Daily data-request limit reached. Try again later." }, { status: 429 });
  const { data, error } = await context.supabase.from("data_rights_requests").insert({ tenant_id: context.tenant.id, subject_user_id: context.user.id, requested_by: context.user.id, request_type: parsed.data.requestType, request_details: parsed.data.details }).select("id").single();
  if (error) return NextResponse.json({ error: /duplicate|uq_open/i.test(error.message) ? "An open request of this type already exists." : /data_rights_requests|schema cache/i.test(error.message) ? "Data governance migration 0032 is required." : "Unable to submit the request." }, { status: 500 });
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: `member.data.${parsed.data.requestType}_requested`, entity_type: "data_rights_request", entity_id: data.id, metadata: {} }); return NextResponse.json({ submitted: true });
}
