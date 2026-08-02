import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coachSourceTypes, listCoachSourceCandidates, resolveCoachSource } from "@/lib/ai/coach-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";

const settingsSchema = z.object({ action: z.literal("settings"), enabled: z.boolean(), coachName: z.string().trim().min(2).max(80), welcomeMessage: z.string().trim().min(2).max(1000), disclaimerText: z.string().trim().min(20).max(3000), crisisMessage: z.string().trim().min(20).max(2000), tone: z.string().trim().min(2).max(300), systemInstructions: z.string().trim().max(5000), citationsRequired: z.boolean(), retainMessageContent: z.boolean(), maxRequestsPerHour: z.number().int().min(1).max(200) });
const sourceSchema = z.object({ action: z.literal("source"), sourceType: z.enum(coachSourceTypes), sourceId: z.string().uuid(), approved: z.boolean() });
const schema = z.discriminatedUnion("action", [settingsSchema, sourceSchema]);

async function authorize() { return getActiveTenantWithPermission("tenant.settings.manage"); }

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Organization settings permission is required." }, { status: 403 });
  const admin = createAdminClient();
  const [{ data: settings, error }, { data: sources }, candidates] = await Promise.all([
    admin.from("tenant_ai_settings").select("*").eq("tenant_id", context.tenant.id).maybeSingle(),
    admin.from("ai_knowledge_sources").select("id,source_type,source_id,source_title,status,source_url,approved_at").eq("tenant_id", context.tenant.id).order("source_title"),
    listCoachSourceCandidates(context.tenant.id, context.tenant.slug)
  ]);
  if (error && /coach_name|schema cache/i.test(error.message)) return NextResponse.json({ error: "AI Coach migration 0025 is required." }, { status: 503 });
  const approved = new Map((sources ?? []).map((source) => [`${source.source_type}:${source.source_id}`, source]));
  return NextResponse.json({ settings, sources: candidates.map((candidate) => ({ ...candidate, text: undefined, approved: approved.get(`${candidate.sourceType}:${candidate.sourceId}`)?.status === "approved" })) });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the AI Coach configuration." }, { status: 400 });
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Organization settings permission is required." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "ai");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const admin = createAdminClient(); const input = parsed.data; const now = new Date().toISOString();
  if (input.action === "settings") {
    const { error } = await admin.from("tenant_ai_settings").upsert({ tenant_id: context.tenant.id, enabled: input.enabled, coach_name: input.coachName, welcome_message: input.welcomeMessage, disclaimer_text: input.disclaimerText, crisis_message: input.crisisMessage, tone: input.tone, system_instructions: input.systemInstructions, citations_required: input.citationsRequired, retain_message_content: input.retainMessageContent, max_requests_per_hour: input.maxRequestsPerHour, updated_at: now }, { onConflict: "tenant_id" });
    if (error) return NextResponse.json({ error: /coach_name|schema cache/i.test(error.message) ? "AI Coach migration 0025 is required." : "Unable to save AI Coach settings." }, { status: 500 });
    await admin.from("tenant_feature_entitlements").upsert({ tenant_id: context.tenant.id, feature_key: "ai_coach", enabled: input.enabled, source: "override", updated_at: now }, { onConflict: "tenant_id,feature_key" });
  } else {
    const source = await resolveCoachSource(context.tenant.id, context.tenant.slug, input.sourceType, input.sourceId);
    if (!source) return NextResponse.json({ error: "That published source is no longer available." }, { status: 404 });
    const { error } = await admin.from("ai_knowledge_sources").upsert({ tenant_id: context.tenant.id, source_type: source.sourceType, source_id: source.sourceId, source_title: source.title, search_text: source.text.slice(0, 100000), source_url: source.url, access_content_type: source.accessContentType, access_content_id: source.accessContentId, access_level: source.accessLevel, status: input.approved ? "approved" : "excluded", approved_by: input.approved ? context.user.id : null, approved_at: input.approved ? now : null, updated_at: now }, { onConflict: "tenant_id,source_type,source_id" });
    if (error) return NextResponse.json({ error: /source_title|schema cache/i.test(error.message) ? "AI Coach migration 0025 is required." : "Unable to update the knowledge source." }, { status: 500 });
  }
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: input.action === "settings" ? "tenant.ai_coach.settings_updated" : "tenant.ai_coach.source_updated", entity_type: "ai_coach", metadata: input.action === "source" ? { source_type: input.sourceType, source_id: input.sourceId, approved: input.approved } : { enabled: input.enabled } });
  return NextResponse.json({ saved: true });
}
