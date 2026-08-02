import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAccess, getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const startSchema = z.object({ action: z.literal("start"), tenantAId: z.string().uuid(), tenantBId: z.string().uuid(), releaseReference: z.string().trim().min(1).max(500), notes: z.string().trim().max(5000) }).refine((value) => value.tenantAId !== value.tenantBId, { message: "Select two distinct production tenants." });
const resultSchema = z.object({ action: z.literal("result"), id: z.string().uuid(), status: z.enum(["passed", "failed", "blocked"]), evidenceReference: z.string().trim().min(1).max(1000), notes: z.string().trim().max(5000) });
const finalizeSchema = z.object({ action: z.literal("finalize"), runId: z.string().uuid() });
const schema = z.union([startSchema, resultSchema, finalizeSchema]);

export async function GET() {
  const access = await getPlatformAccess();
  if (!access?.permissions.has("platform.audit.view")) return NextResponse.json({ error: "Platform audit permission is required." }, { status: 403 });
  const admin = createAdminClient();
  const [{ data: runs, error }, { data: results }, { data: cases }, { data: tenants }] = await Promise.all([
    admin.from("rls_verification_runs").select("*").order("started_at", { ascending: false }).limit(25),
    admin.from("rls_verification_results").select("id,run_id,case_key,status,evidence_reference,evidence,notes,verified_at,updated_at").order("updated_at", { ascending: false }).limit(500),
    admin.from("rls_verification_case_catalog").select("case_key,label,description,verification_mode,risk_level,sort_order").eq("active", true).order("sort_order"),
    admin.from("tenants").select("id,name,status").is("deleted_at", null).order("name")
  ]);
  if (error) return NextResponse.json({ error: /schema cache|does not exist/i.test(error.message) ? "Isolation verification migration 0037 is required." : "Unable to load isolation evidence." }, { status: 500 });
  return NextResponse.json({ runs: runs ?? [], results: results ?? [], cases: cases ?? [], tenants: tenants ?? [], canManage: access.permissions.has("platform.security.manage") }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the verification evidence." }, { status: 400 });
  const access = await getPlatformAdministrator("platform.security.manage");
  if (!access) return NextResponse.json({ error: "Platform security management permission is required." }, { status: 403 });
  const admin = createAdminClient(); const userClient = await createClient(); const input = parsed.data;
  if (input.action === "start") {
    const { data, error } = await userClient.rpc("start_production_rls_verification", { target_tenant_a: input.tenantAId, target_tenant_b: input.tenantBId, target_release_reference: input.releaseReference, target_notes: input.notes });
    if (error || !data) return NextResponse.json({ error: /two_distinct|release_reference/i.test(error?.message ?? "") ? "Select two distinct production tenants and provide a release reference." : "Unable to start the production isolation verification." }, { status: 500 });
    await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: "platform.rls_verification.started", entity_type: "rls_verification_run", entity_id: data, metadata: { release_reference: input.releaseReference } });
    return NextResponse.json({ runId: data });
  }
  if (input.action === "result") {
    const { data: result } = await admin.from("rls_verification_results").select("id,run_id,case_key,rls_verification_runs!inner(status),rls_verification_case_catalog!inner(verification_mode)").eq("id", input.id).maybeSingle();
    const run = result?.rls_verification_runs as unknown as { status?: string } | null; const verificationCase = result?.rls_verification_case_catalog as unknown as { verification_mode?: string } | null;
    if (!result || run?.status !== "in_progress") return NextResponse.json({ error: "An active verification result is required." }, { status: 409 });
    if (verificationCase?.verification_mode !== "manual_behavioral") return NextResponse.json({ error: "Automatic metadata results cannot be manually overridden." }, { status: 409 });
    const now = new Date().toISOString(); const { error } = await admin.from("rls_verification_results").update({ status: input.status, evidence_reference: input.evidenceReference, notes: input.notes, verified_by: access.user.id, verified_at: now, updated_at: now }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to record the isolation evidence." }, { status: 500 });
    await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: `platform.rls_verification.${input.status}`, entity_type: "rls_verification_result", entity_id: input.id, metadata: { case_key: result.case_key, run_id: result.run_id } });
    return NextResponse.json({ saved: true });
  }
  const { data, error } = await userClient.rpc("finalize_production_rls_verification", { target_run: input.runId });
  if (error) return NextResponse.json({ error: /pending_verification_results/i.test(error.message) ? "Every verification case needs evidence before finalization." : "Unable to finalize the verification run." }, { status: 409 });
  await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: `platform.rls_verification.${data}`, entity_type: "rls_verification_run", entity_id: input.runId, metadata: {} });
  return NextResponse.json({ status: data });
}
