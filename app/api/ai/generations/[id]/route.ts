import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialMutationError } from "@/lib/trials";

const schema = z.object({
  output: z.array(z.string().trim().min(1).max(50000)).min(1).max(5),
  status: z.enum(["draft", "saved", "archived"]).default("saved")
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Choose a valid AI draft." }, { status: 400 });
  const context = await getActiveTenantWithPermission("tenant.ai.use");
  if (!context) return NextResponse.json({ error: "AI Studio permission is required." }, { status: 403 });
  const admin = createAdminClient();
  const { data: entitlement } = await admin.from("tenant_feature_entitlements").select("enabled").eq("tenant_id", context.tenant.id).eq("feature_key", "creator_ai_studio").maybeSingle();
  if (entitlement && !entitlement.enabled) return NextResponse.json({ error: "Creator AI Studio is not enabled for this tenant." }, { status: 403 });
  const [{ data: generation }, { data: versions }] = await Promise.all([
    admin.from("ai_generations").select("id,source_title,output_type,output,status,current_version,updated_at").eq("tenant_id", context.tenant.id).eq("id", id).maybeSingle(),
    admin.from("ai_generation_versions").select("id,version,status,change_type,created_at").eq("tenant_id", context.tenant.id).eq("generation_id", id).order("version", { ascending: false })
  ]);
  if (!generation) return NextResponse.json({ error: "AI draft not found." }, { status: 404 });
  return NextResponse.json({ generation, versions: versions ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Choose a valid AI draft." }, { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "AI draft content is invalid." }, { status: 400 });
  const context = await getActiveTenantWithPermission("tenant.ai.use");
  if (!context) return NextResponse.json({ error: "AI Studio permission is required." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "ai");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const admin = createAdminClient();
  const { data: entitlement } = await admin.from("tenant_feature_entitlements").select("enabled").eq("tenant_id", context.tenant.id).eq("feature_key", "creator_ai_studio").maybeSingle();
  if (entitlement && !entitlement.enabled) return NextResponse.json({ error: "Creator AI Studio is not enabled for this tenant." }, { status: 403 });
  const { data: current } = await admin.from("ai_generations").select("id,user_id,current_version,status").eq("tenant_id", context.tenant.id).eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ error: "AI draft not found." }, { status: 404 });
  const nextVersion = Number(current.current_version ?? 1) + 1;
  const { error: versionError } = await admin.from("ai_generation_versions").insert({ tenant_id: context.tenant.id, generation_id: id, version: nextVersion, output: parsed.data.output, status: parsed.data.status, change_type: current.status === parsed.data.status ? "edited" : "status_changed", edited_by: context.user.id });
  if (versionError) return NextResponse.json({ error: /ai_generation_versions|schema cache/i.test(versionError.message) ? "AI Studio workflow migration 0023 is required." : "Unable to save the AI draft version." }, { status: 500 });
  const { error: updateError } = await admin.from("ai_generations").update({ output: parsed.data.output, variation_count: parsed.data.output.length, status: parsed.data.status, current_version: nextVersion, updated_at: new Date().toISOString() }).eq("tenant_id", context.tenant.id).eq("id", id);
  if (updateError) {
    await admin.from("ai_generation_versions").delete().eq("generation_id", id).eq("version", nextVersion);
    return NextResponse.json({ error: "Unable to save the AI draft." }, { status: 500 });
  }
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: "tenant.ai_generation.version_saved", entity_type: "ai_generation", entity_id: id, metadata: { version: nextVersion, status: parsed.data.status } });
  return NextResponse.json({ id, version: nextVersion, status: parsed.data.status });
}
