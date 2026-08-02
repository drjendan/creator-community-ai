import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAccess, getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.union([
  z.object({ action: z.literal("start"), releaseReference: z.string().trim().min(1).max(500), applicationVersion: z.string().trim().min(1).max(200), notes: z.string().trim().max(5000) }),
  z.object({ action: z.literal("result"), id: z.string().uuid(), status: z.enum(["passed","failed","blocked"]), evidenceReference: z.string().trim().min(1).max(1000), notes: z.string().trim().max(5000) }),
  z.object({ action: z.literal("finalize"), runId: z.string().uuid() })
]);

export async function GET() {
  const access = await getPlatformAccess(); if (!access?.permissions.has("platform.audit.view")) return NextResponse.json({ error: "Platform audit permission is required." }, { status: 403 });
  const admin = createAdminClient(); const [{ data: runs, error }, { data: results }, { data: cases }] = await Promise.all([
    admin.from("quality_verification_runs").select("*").order("started_at", { ascending: false }).limit(25),
    admin.from("quality_verification_results").select("id,run_id,case_key,status,evidence_reference,notes,verified_at,updated_at").order("updated_at", { ascending: false }).limit(500),
    admin.from("quality_verification_case_catalog").select("case_key,label,description,category,verification_mode,critical,sort_order").eq("active", true).order("sort_order")
  ]);
  if (error) return NextResponse.json({ error: /schema cache|does not exist/i.test(error.message) ? "Quality verification migration 0038 is required." : "Unable to load quality evidence." }, { status: 500 });
  return NextResponse.json({ runs: runs ?? [], results: results ?? [], cases: cases ?? [], canManage: access.permissions.has("platform.quality.manage") }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the quality evidence." }, { status: 400 });
  const access = await getPlatformAdministrator("platform.quality.manage"); if (!access) return NextResponse.json({ error: "Platform quality management permission is required." }, { status: 403 });
  const admin = createAdminClient(); const userClient = await createClient(); const input = parsed.data;
  if (input.action === "start") {
    const { data, error } = await userClient.rpc("start_production_quality_verification", { target_release_reference: input.releaseReference, target_application_version: input.applicationVersion, target_notes: input.notes });
    if (error || !data) return NextResponse.json({ error: "Unable to start the production quality verification." }, { status: 500 });
    await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: "platform.quality_verification.started", entity_type: "quality_verification_run", entity_id: data, metadata: { release_reference: input.releaseReference, application_version: input.applicationVersion } });
    return NextResponse.json({ runId: data });
  }
  if (input.action === "result") {
    const { data: result } = await admin.from("quality_verification_results").select("id,run_id,case_key,quality_verification_runs!inner(status)").eq("id", input.id).maybeSingle(); const run = result?.quality_verification_runs as unknown as { status?: string } | null;
    if (!result || run?.status !== "in_progress") return NextResponse.json({ error: "An active quality result is required." }, { status: 409 });
    const now = new Date().toISOString(); const { error } = await admin.from("quality_verification_results").update({ status: input.status, evidence_reference: input.evidenceReference, notes: input.notes, verified_by: access.user.id, verified_at: now, updated_at: now }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to record the quality evidence." }, { status: 500 });
    await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: `platform.quality_verification.${input.status}`, entity_type: "quality_verification_result", entity_id: input.id, metadata: { case_key: result.case_key, run_id: result.run_id } }); return NextResponse.json({ saved: true });
  }
  const { data, error } = await userClient.rpc("finalize_production_quality_verification", { target_run: input.runId });
  if (error) return NextResponse.json({ error: /pending_quality_results/i.test(error.message) ? "Every quality case needs evidence before finalization." : "Unable to finalize the quality run." }, { status: 409 });
  await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: `platform.quality_verification.${data}`, entity_type: "quality_verification_run", entity_id: input.runId, metadata: {} }); return NextResponse.json({ status: data });
}
