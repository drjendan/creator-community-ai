import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptApiKey } from "@/lib/security/api-key-encryption";
import { ResendEmailProviderAdapter } from "@/lib/communications/provider";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getActiveEmailProvider(_supabase: SupabaseClient, tenantId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_communication_provider_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("channel", "email")
    .eq("is_active", true)
    .maybeSingle();
  if (!data || data.connection_status !== "connected" || data.verification_status !== "verified") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    const [{ data: tenant }, { data: branding }] = await Promise.all([
      admin.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      admin.from("tenant_branding").select("organization_short_name,support_email").eq("tenant_id", tenantId).maybeSingle()
    ]);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "notifications@upnexx.net";
    if (!fromEmail.toLowerCase().endsWith("@upnexx.net")) return null;
    return {
      config: {
        provider: "resend",
        from_name: branding?.organization_short_name || tenant?.name || "UpNexx",
        from_email: fromEmail,
        reply_to_email: branding?.support_email || null,
        connection_status: "connected",
        verification_status: "verified",
        source: "platform"
      },
      adapter: new ResendEmailProviderAdapter(apiKey)
    };
  }
  return {
    config: data,
    adapter: new ResendEmailProviderAdapter(decryptApiKey(data.encrypted_api_key))
  };
}
