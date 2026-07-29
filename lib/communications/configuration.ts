import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptApiKey } from "@/lib/security/api-key-encryption";
import { ResendEmailProviderAdapter } from "@/lib/communications/provider";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getActiveEmailProvider(_supabase: SupabaseClient, tenantId: string) {
  const { data } = await createAdminClient()
    .from("tenant_communication_provider_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("channel", "email")
    .eq("is_active", true)
    .maybeSingle();
  if (
    !data ||
    data.connection_status !== "connected" ||
    data.verification_status !== "verified"
  ) {
    return null;
  }
  return {
    config: data,
    adapter: new ResendEmailProviderAdapter(decryptApiKey(data.encrypted_api_key))
  };
}
