import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAIConfiguration } from "@/lib/ai/config-authorization";
import { isAllowedModel, providerIds } from "@/lib/ai/provider-catalog";
import { encryptApiKey, getKeyLastFour } from "@/lib/security/api-key-encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const contextSchema = z.enum(["tenant", "platform"]);
const tenantIdSchema = z.string().uuid().optional();
const providerSchema = z.enum(providerIds);
const writeSchema = z.object({
  context: contextSchema,
  tenantId: tenantIdSchema,
  provider: providerSchema,
  model: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(8).max(500).optional().or(z.literal("")),
  enabled: z.boolean(),
  isDefault: z.boolean().default(true)
});

function safeConfiguration(row: Record<string, unknown>, currentUserId: string) {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    key_last_four: row.key_last_four,
    enabled: row.enabled,
    is_default: row.is_default,
    verification_status: row.verification_status,
    last_verified_at: row.last_verified_at,
    last_verification_error_code: row.last_verification_error_code,
    updated_at: row.updated_at,
    updated_by_label: row.updated_context === "platform"
      ? "UpNexx administrator"
      : row.updated_by === currentUserId ? "You" : row.updated_by ? "Another administrator" : "Unknown"
  };
}

async function audit(input: {
  tenantId: string; userId: string; action: string; role: string; context: string;
  provider: string; success?: boolean; metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    action: input.action,
    entity_type: "ai_provider_settings",
    metadata: { provider: input.provider, acting_role: input.role, context: input.context, success: input.success ?? true, ...input.metadata }
  });
}

export async function GET(request: NextRequest) {
  const context = contextSchema.safeParse(request.nextUrl.searchParams.get("context") ?? "tenant");
  const tenantId = tenantIdSchema.safeParse(request.nextUrl.searchParams.get("tenantId") || undefined);
  if (!context.success || !tenantId.success) return NextResponse.json({ error: "Invalid configuration context." }, { status: 400 });
  const authorization = await authorizeAIConfiguration({ context: context.data, requestedTenantId: tenantId.data });
  if (!authorization) return NextResponse.json({ error: "You are not authorized to view AI configuration for this organization." }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_provider_settings")
    .select("id,provider,model,key_last_four,enabled,is_default,verification_status,last_verified_at,last_verification_error_code,updated_at,updated_by,updated_context")
    .eq("tenant_id", authorization.tenantId)
    .order("provider");
  if (error) return NextResponse.json({ error: "Unable to load AI provider settings." }, { status: 500 });
  return NextResponse.json({
    tenant: { id: authorization.tenantId, name: authorization.tenantName },
    configurations: (data ?? []).map((row) => safeConfiguration(row, authorization.user.id)),
    canWrite: authorization.canWrite
  });
}

export async function POST(request: NextRequest) {
  const parsed = writeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isAllowedModel(parsed.data.provider, parsed.data.model)) {
    return NextResponse.json({ error: "Select a supported provider and approved model." }, { status: 400 });
  }
  const authorization = await authorizeAIConfiguration({ context: parsed.data.context, requestedTenantId: parsed.data.tenantId, write: true });
  if (!authorization) return NextResponse.json({ error: "You are not authorized to change AI configuration for this organization." }, { status: 403 });
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("ai_provider_settings")
    .select("id,encrypted_api_key,key_last_four,provider,enabled,is_default,model")
    .eq("tenant_id", authorization.tenantId)
    .eq("provider", parsed.data.provider)
    .maybeSingle();
  if (!existing && !parsed.data.apiKey) return NextResponse.json({ error: "Enter an API key for the first connection." }, { status: 400 });
  if (existing?.is_default && !parsed.data.isDefault) {
    const { data: anotherDefault } = await admin
      .from("ai_provider_settings")
      .select("id")
      .eq("tenant_id", authorization.tenantId)
      .eq("is_default", true)
      .neq("provider", parsed.data.provider)
      .maybeSingle();
    if (!anotherDefault) {
      return NextResponse.json({ error: "Select another default provider before removing the default designation." }, { status: 400 });
    }
  }

  const submittedApiKey = parsed.data.apiKey ?? "";
  const keyChanged = Boolean(submittedApiKey);
  let encryptedApiKey = existing?.encrypted_api_key;
  if (keyChanged) {
    try {
      encryptedApiKey = encryptApiKey(submittedApiKey);
    } catch {
      return NextResponse.json({ error: "Secure credential storage is not configured. Contact an UpNexx administrator." }, { status: 503 });
    }
  }
  const keyLastFour = keyChanged ? getKeyLastFour(submittedApiKey) : existing?.key_last_four;
  if (parsed.data.isDefault) {
    await admin.from("ai_provider_settings").update({ is_default: false, updated_at: new Date().toISOString() }).eq("tenant_id", authorization.tenantId);
  }
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    tenant_id: authorization.tenantId,
    provider: parsed.data.provider,
    model: parsed.data.model,
    encrypted_api_key: encryptedApiKey,
    key_last_four: keyLastFour,
    enabled: parsed.data.enabled,
    is_default: parsed.data.isDefault,
    updated_by: authorization.user.id,
    updated_context: authorization.context,
    updated_at: now
  };
  if (keyChanged) {
    payload.verification_status = "not_verified";
    payload.last_verified_at = null;
    payload.last_verification_error_code = null;
  }
  if (!existing) payload.created_by = authorization.user.id;
  const { data, error } = await admin.from("ai_provider_settings").upsert(payload, { onConflict: "tenant_id,provider" }).select("id,provider,model,key_last_four,enabled,is_default,verification_status,last_verified_at,last_verification_error_code,updated_at,updated_by,updated_context").single();
  if (error) return NextResponse.json({ error: "Unable to save AI provider settings." }, { status: 500 });
  if (parsed.data.enabled) {
    await admin.from("tenant_ai_settings").upsert(
      { tenant_id: authorization.tenantId, enabled: true, updated_at: now },
      { onConflict: "tenant_id" }
    );
  }
  const action = !existing
    ? "tenant.ai_provider.configured"
    : keyChanged
      ? "tenant.ai_provider.key_replaced"
      : existing.enabled !== parsed.data.enabled
        ? parsed.data.enabled ? "tenant.ai_provider.enabled" : "tenant.ai_provider.disabled"
        : existing.is_default !== parsed.data.isDefault
          ? "tenant.ai_provider.default_changed"
          : "tenant.ai_provider.updated";
  await audit({
    tenantId: authorization.tenantId,
    userId: authorization.user.id,
    action,
    role: authorization.actingRole,
    context: authorization.context,
    provider: parsed.data.provider,
    metadata: { model: parsed.data.model, enabled: parsed.data.enabled, is_default: parsed.data.isDefault, key_changed: keyChanged }
  });
  return NextResponse.json({ configuration: safeConfiguration(data, authorization.user.id) });
}

export async function DELETE(request: NextRequest) {
  const context = contextSchema.safeParse(request.nextUrl.searchParams.get("context") ?? "tenant");
  const tenantId = tenantIdSchema.safeParse(request.nextUrl.searchParams.get("tenantId") || undefined);
  const provider = providerSchema.safeParse(request.nextUrl.searchParams.get("provider"));
  if (!context.success || !tenantId.success || !provider.success) return NextResponse.json({ error: "Invalid configuration request." }, { status: 400 });
  const authorization = await authorizeAIConfiguration({ context: context.data, requestedTenantId: tenantId.data, write: true });
  if (!authorization) return NextResponse.json({ error: "You are not authorized to remove this configuration." }, { status: 403 });
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("ai_provider_settings")
    .select("id,is_default")
    .eq("tenant_id", authorization.tenantId)
    .eq("provider", provider.data)
    .maybeSingle();
  const { error } = await admin.from("ai_provider_settings").delete().eq("tenant_id", authorization.tenantId).eq("provider", provider.data);
  if (error) return NextResponse.json({ error: "Unable to remove the AI provider configuration." }, { status: 500 });
  if (existing?.is_default) {
    const { data: replacement } = await admin
      .from("ai_provider_settings")
      .select("id")
      .eq("tenant_id", authorization.tenantId)
      .order("enabled", { ascending: false })
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (replacement) await admin.from("ai_provider_settings").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", replacement.id);
  }
  await audit({ tenantId: authorization.tenantId, userId: authorization.user.id, action: "tenant.ai_provider.removed", role: authorization.actingRole, context: authorization.context, provider: provider.data });
  return NextResponse.json({ removed: true });
}
