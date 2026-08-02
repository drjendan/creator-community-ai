import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAccess, getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.union([
  z.object({ action: z.literal("create"), releaseReference: z.string().trim().min(1).max(500), applicationVersion: z.string().trim().min(1).max(200), commitSha: z.string().regex(/^[0-9a-f]{40}$/), artifactSha256: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.object({ action: z.literal("approve"), id: z.string().uuid(), evidenceReference: z.string().trim().min(1).max(1000), notes: z.string().trim().max(5000) }),
  z.object({ action: z.literal("release"), id: z.string().uuid(), evidenceReference: z.string().trim().min(1).max(1000), notes: z.string().trim().max(5000) }),
  z.object({ action: z.literal("cancel"), id: z.string().uuid(), notes: z.string().trim().min(10).max(5000) })
]);

export async function GET() {
  const access = await getPlatformAccess();
  if (!access?.permissions.has("platform.audit.view")) return NextResponse.json({ error: "Platform audit permission is required." }, { status: 403 });
  const admin = createAdminClient();
  const [{ data: releases, error }, { data: events }, { data: checks }] = await Promise.all([
    admin.from("production_release_candidates").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("production_release_events").select("*").order("performed_at", { ascending: false }).limit(250),
    admin.from("production_readiness_checks").select("check_key,label,status,evidence_reference,updated_at").order("category").order("label")
  ]);
  if (error) return NextResponse.json({ error: /schema cache|does not exist/i.test(error.message) ? "Production release migration 0040 is required." : "Unable to load production releases." }, { status: 500 });
  return NextResponse.json({ releases: releases ?? [], events: events ?? [], checks: checks ?? [], canManage: access.permissions.has("platform.release.manage"), canApprove: access.permissions.has("platform.release.approve") }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the release package." }, { status: 400 });
  const input = parsed.data;
  const requiredPermission = input.action === "approve" || input.action === "release" ? "platform.release.approve" : "platform.release.manage";
  const access = await getPlatformAdministrator(requiredPermission);
  if (!access) return NextResponse.json({ error: "The required production release permission is missing." }, { status: 403 });
  const client = await createClient();
  let result: { data: unknown; error: { message: string } | null };
  if (input.action === "create") result = await client.rpc("create_production_release_candidate", { target_release_reference: input.releaseReference, target_application_version: input.applicationVersion, target_commit_sha: input.commitSha, target_artifact_sha256: input.artifactSha256 });
  else if (input.action === "approve") result = await client.rpc("approve_production_release_candidate", { target_release: input.id, target_evidence_reference: input.evidenceReference, target_notes: input.notes });
  else if (input.action === "release") result = await client.rpc("record_production_release_deployment", { target_release: input.id, target_evidence_reference: input.evidenceReference, target_notes: input.notes });
  else result = await client.rpc("cancel_production_release_candidate", { target_release: input.id, target_notes: input.notes });
  if (result.error) {
    const message = result.error.message;
    const publicMessage = /production_readiness_blocked/i.test(message) ? "Every production-readiness gate must be passed or explicitly waived before packaging." : /matching_rls/i.test(message) ? "A passed production RLS run with this release reference is required." : /matching_quality/i.test(message) ? "A passed quality run with this release reference and application version is required." : /readiness_snapshot_changed|verification_regressed/i.test(message) ? "Release evidence changed after packaging. Cancel this candidate and create a fresh one." : "Unable to update the production release package.";
    return NextResponse.json({ error: publicMessage }, { status: 409 });
  }
  const admin = createAdminClient();
  const entityId = input.action === "create" ? String(result.data) : input.id;
  await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: `platform.production_release.${input.action}`, entity_type: "production_release_candidate", entity_id: entityId, metadata: {} });
  return NextResponse.json(input.action === "create" ? { releaseId: result.data } : { saved: true });
}
