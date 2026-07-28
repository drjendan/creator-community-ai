import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encryptApiKey, getKeyLastFour } from "@/lib/security/api-key-encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const tenantSchema = z.string().uuid();
const settingsSchema = z.object({
  tenantId: tenantSchema,
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().min(8).max(500).optional().or(z.literal("")),
  enabled: z.boolean()
});

const allowedRoles = [
  "tenant_owner",
  "tenant_admin",
  "platform_owner",
  "platform_admin"
];

async function authorize(tenantId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", allowedRoles)
    .maybeSingle();

  return membership ? user : null;
}

export async function GET(request: NextRequest) {
  const parsedTenant = tenantSchema.safeParse(request.nextUrl.searchParams.get("tenantId"));
  if (!parsedTenant.success) {
    return NextResponse.json({ error: "A valid tenant is required." }, { status: 400 });
  }

  const user = await authorize(parsedTenant.data);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_provider_settings")
    .select("provider,model,key_last_four,enabled,updated_at")
    .eq("tenant_id", parsedTenant.data)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load AI settings." }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function POST(request: NextRequest) {
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the provider, model, and API key." }, { status: 400 });
  }

  const user = await authorize(parsed.data.tenantId);
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("ai_provider_settings")
    .select("encrypted_api_key,key_last_four")
    .eq("tenant_id", parsed.data.tenantId)
    .maybeSingle();

  if (!existing && !parsed.data.apiKey) {
    return NextResponse.json({ error: "Enter an API key for the first connection." }, { status: 400 });
  }

  const encryptedApiKey = parsed.data.apiKey
    ? encryptApiKey(parsed.data.apiKey)
    : existing?.encrypted_api_key;
  const keyLastFour = parsed.data.apiKey
    ? getKeyLastFour(parsed.data.apiKey)
    : existing?.key_last_four;

  const { error } = await admin.from("ai_provider_settings").upsert(
    {
      tenant_id: parsed.data.tenantId,
      provider: parsed.data.provider,
      model: parsed.data.model,
      encrypted_api_key: encryptedApiKey,
      key_last_four: keyLastFour,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString()
    },
    { onConflict: "tenant_id" }
  );

  if (error) return NextResponse.json({ error: "Unable to save AI settings." }, { status: 500 });

  await admin.from("audit_logs").insert({
    tenant_id: parsed.data.tenantId,
    user_id: user.id,
    action: "tenant.ai_provider.updated",
    entity_type: "ai_provider_settings",
    metadata: { provider: parsed.data.provider, model: parsed.data.model }
  });

  return NextResponse.json({
    settings: {
      provider: parsed.data.provider,
      model: parsed.data.model,
      key_last_four: keyLastFour,
      enabled: parsed.data.enabled,
      updated_at: new Date().toISOString()
    }
  });
}

