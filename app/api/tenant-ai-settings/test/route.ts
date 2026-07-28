import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAIConfiguration } from "@/lib/ai/config-authorization";
import { getProviderAdapter, providerErrorMessage } from "@/lib/ai/provider-adapters";
import { isAllowedModel, providerIds } from "@/lib/ai/provider-catalog";
import { decryptApiKey } from "@/lib/security/api-key-encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  context: z.enum(["tenant", "platform"]),
  tenantId: z.string().uuid().optional(),
  provider: z.enum(providerIds),
  model: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(8).max(500).optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isAllowedModel(parsed.data.provider, parsed.data.model)) return NextResponse.json({ error: "Select a supported provider and approved model." }, { status: 400 });
  const authorization = await authorizeAIConfiguration({ context: parsed.data.context, requestedTenantId: parsed.data.tenantId, write: true });
  if (!authorization) return NextResponse.json({ error: "You are not authorized to test this configuration." }, { status: 403 });
  const admin = createAdminClient();
  const { data: stored } = await admin.from("ai_provider_settings")
    .select("encrypted_api_key")
    .eq("tenant_id", authorization.tenantId)
    .eq("provider", parsed.data.provider)
    .maybeSingle();
  if (!parsed.data.apiKey && !stored?.encrypted_api_key) return NextResponse.json({ error: "Enter or save an API key before testing." }, { status: 400 });
  let apiKey = parsed.data.apiKey ?? "";
  try {
    if (!apiKey && stored) apiKey = decryptApiKey(stored.encrypted_api_key);
  } catch {
    return NextResponse.json({ error: "The stored credential could not be decrypted. Replace the API key." }, { status: 409 });
  }
  const result = await getProviderAdapter(parsed.data.provider).testConnection(apiKey, parsed.data.model);
  const now = new Date().toISOString();
  // A candidate key must never verify the previously stored credential.
  // Persist verification only when the stored key itself was tested.
  if (stored && !parsed.data.apiKey) {
    await admin.from("ai_provider_settings").update({
      verification_status: result.ok ? "verified" : "failed",
      last_verified_at: result.ok ? now : null,
      last_verification_error_code: result.ok ? null : result.code,
      updated_by: authorization.user.id,
      updated_context: authorization.context,
      updated_at: now
    }).eq("tenant_id", authorization.tenantId).eq("provider", parsed.data.provider);
  }
  await admin.from("audit_logs").insert({
    tenant_id: authorization.tenantId,
    user_id: authorization.user.id,
    action: result.ok ? "tenant.ai_provider.verification_succeeded" : "tenant.ai_provider.verification_failed",
    entity_type: "ai_provider_settings",
    metadata: { provider: parsed.data.provider, model: parsed.data.model, acting_role: authorization.actingRole, context: authorization.context, success: result.ok, error_code: result.ok ? null : result.code }
  });
  if (!result.ok) return NextResponse.json({ ok: false, code: result.code, message: providerErrorMessage(result.code) }, { status: 422 });
  return NextResponse.json({ ok: true, message: "Connection successful. The API key is valid and the selected model is available.", storedCredentialTested: !parsed.data.apiKey });
}
