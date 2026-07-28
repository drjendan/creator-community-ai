import "server-only";

import { getProviderAdapter, ProviderAdapterError } from "@/lib/ai/provider-adapters";
import { isAIProviderId } from "@/lib/ai/provider-catalog";
import { decryptApiKey } from "@/lib/security/api-key-encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export class TenantAIConfigurationError extends Error {
  constructor(public readonly code: "provider_not_configured" | "invalid_configuration") {
    super(code);
  }
}

class TenantAIProviderCallError extends Error {
  constructor(
    public readonly code: ProviderAdapterError["code"],
    public readonly provider: string,
    public readonly model: string
  ) {
    super(code);
  }
}

export async function generateTenantText(input: { tenantId: string; prompt: string }) {
  const admin = createAdminClient();
  const { data: configuration, error } = await admin
    .from("ai_provider_settings")
    .select("provider,model,encrypted_api_key")
    .eq("tenant_id", input.tenantId)
    .eq("enabled", true)
    .eq("is_default", true)
    .eq("verification_status", "verified")
    .maybeSingle();

  if (error) throw new TenantAIConfigurationError("invalid_configuration");
  if (!configuration) throw new TenantAIConfigurationError("provider_not_configured");
  if (!isAIProviderId(configuration.provider)) throw new TenantAIConfigurationError("invalid_configuration");

  let apiKey: string;
  try {
    apiKey = decryptApiKey(configuration.encrypted_api_key);
  } catch {
    throw new TenantAIConfigurationError("invalid_configuration");
  }

  let generated;
  try {
    generated = await getProviderAdapter(configuration.provider).generateText(
      apiKey,
      configuration.model,
      input.prompt
    );
  } catch (error) {
    if (error instanceof ProviderAdapterError) {
      throw new TenantAIProviderCallError(error.code, configuration.provider, configuration.model);
    }
    throw error;
  }
  return {
    ...generated,
    provider: configuration.provider,
    model: configuration.model
  };
}

export function generationErrorResponse(error: unknown) {
  if (error instanceof TenantAIConfigurationError) {
    return error.code === "provider_not_configured"
      ? { status: 409, code: error.code, message: "No verified default AI provider is enabled for this organization." }
      : { status: 409, code: error.code, message: "The organization AI provider configuration needs administrator attention." };
  }
  if (error instanceof TenantAIProviderCallError || error instanceof ProviderAdapterError) {
    const messages = {
      invalid_credential: "The configured provider credential is no longer valid.",
      model_unavailable: "The configured AI model is not available.",
      rate_limited: "The AI provider is rate limited. Try again shortly.",
      insufficient_credits: "The AI provider account has insufficient credits or quota.",
      provider_timeout: "The AI provider did not respond in time.",
      provider_unavailable: "The AI provider is temporarily unavailable.",
      unknown_error: "The AI request failed."
    } as const;
    return {
      status: 502,
      code: error.code,
      message: messages[error.code],
      provider: error instanceof TenantAIProviderCallError ? error.provider : undefined,
      model: error instanceof TenantAIProviderCallError ? error.model : undefined
    };
  }
  return { status: 502, code: "generation_failed", message: "The AI request failed.", provider: undefined, model: undefined };
}
