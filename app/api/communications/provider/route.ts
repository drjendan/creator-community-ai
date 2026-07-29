import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { encryptApiKey, getKeyLastFour, decryptApiKey } from "@/lib/security/api-key-encryption";
import { ResendEmailProviderAdapter } from "@/lib/communications/provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordCommunicationAudit } from "@/lib/communications/operations";

const schema = z.object({
  apiKey: z.string().trim().min(1).optional(),
  fromName: z.string().trim().min(1),
  fromEmail: z.string().email(),
  replyToEmail: z.string().email().or(z.literal("")).optional(),
  action: z.enum(["save", "test", "send_test", "disable", "remove"]).default("save"),
  testRecipient: z.string().email().optional()
});

async function authorized() {
  const context = await getActiveTenantCommunicator();
  if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get("communication_hub") !== true || entitlements.get("communication_byop_email") !== true) return null;
  return context;
}

export async function GET() {
  const context = await authorized();
  if (!context) return NextResponse.json({ error: "Email provider configuration is unavailable." }, { status: 403 });
  const { data, error } = await context.supabase
    .from("tenant_communication_provider_configs")
    .select("id,provider,key_last_four,from_name,from_email,reply_to_email,connection_status,verification_status,domain_verification_status,last_tested_at,last_test_result,is_active")
    .eq("tenant_id", context.tenant.id)
    .eq("channel", "email")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load the email provider configuration." }, { status: 500 });
  return NextResponse.json({ configuration: data ? { ...data, masked_key: `••••${data.key_last_four}` } : null });
}

export async function POST(request: NextRequest) {
  const context = await authorized();
  if (!context) return NextResponse.json({ error: "Email provider configuration is unavailable." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid configuration." }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("tenant_communication_provider_configs")
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .eq("channel", "email")
    .maybeSingle();
  if (!parsed.data.apiKey && !existing?.encrypted_api_key) return NextResponse.json({ error: "A Resend API key is required." }, { status: 400 });
  const apiKey = parsed.data.apiKey || decryptApiKey(existing.encrypted_api_key);
  const adapter = new ResendEmailProviderAdapter(apiKey);
  const now = new Date().toISOString();
  const audit = (action: string, metadata?: Record<string, unknown>) =>
    recordCommunicationAudit(admin, {
      tenantId: context.tenant.id,
      actorId: context.user.id,
      actorRole: context.role,
      action,
      resourceType: "email_provider",
      resourceId: existing?.id,
      metadata
    });

  if (parsed.data.action === "test") {
    const result = await adapter.getProviderStatus(parsed.data.fromEmail);
    const verified = result.connected && result.verificationStatus === "verified";
    await admin.from("tenant_communication_provider_configs").upsert({
      tenant_id: context.tenant.id,
      channel: "email",
      provider: "resend",
      encrypted_api_key: encryptApiKey(apiKey),
      key_last_four: getKeyLastFour(apiKey),
      from_name: parsed.data.fromName,
      from_email: parsed.data.fromEmail,
      reply_to_email: parsed.data.replyToEmail || null,
      connection_status: result.connected ? "connected" : "failed",
      verification_status: result.verificationStatus,
      domain_verification_status: result.verificationStatus,
      last_tested_at: now,
      last_test_result: verified ? "Connection and sender domain verified." : result.error,
      is_active: true,
      updated_by: context.user.id,
      created_by: existing?.created_by ?? context.user.id,
      updated_at: now
    }, { onConflict: "tenant_id,channel,provider" });
    await audit("email_provider.tested", { connected: result.connected, verificationStatus: result.verificationStatus });
    return NextResponse.json(
      { ...result, connected: verified },
      { status: verified ? 200 : 422 }
    );
  }

  if (parsed.data.action === "send_test") {
    if (!parsed.data.testRecipient) return NextResponse.json({ error: "Enter a test email recipient." }, { status: 400 });
    const result = await adapter.sendTestEmail({
      fromName: parsed.data.fromName,
      fromEmail: parsed.data.fromEmail,
      replyTo: parsed.data.replyToEmail,
      to: [parsed.data.testRecipient],
      subject: `UpNexx email test from ${context.tenant.name}`,
      html: `<p>This is a test email from <strong>${context.tenant.name}</strong>.</p>`,
      text: `This is a test email from ${context.tenant.name}.`
    });
    await audit("email_provider.test_email", { accepted: result.accepted });
    return NextResponse.json(result, { status: result.accepted ? 200 : 422 });
  }

  if (parsed.data.action === "disable") {
    if (!existing) return NextResponse.json({ error: "No provider configuration exists." }, { status: 404 });
    await admin.from("tenant_communication_provider_configs").update({
      is_active: false, connection_status: "disabled", updated_by: context.user.id, updated_at: now
    }).eq("id", existing.id).eq("tenant_id", context.tenant.id);
    await audit("email_provider.disabled");
    return NextResponse.json({ disabled: true });
  }

  if (parsed.data.action === "remove") {
    if (!existing) return NextResponse.json({ error: "No provider configuration exists." }, { status: 404 });
    const { error } = await admin
      .from("tenant_communication_provider_configs")
      .delete()
      .eq("id", existing.id)
      .eq("tenant_id", context.tenant.id);
    if (error) return NextResponse.json({ error: "Unable to remove the provider configuration." }, { status: 500 });
    await audit("email_provider.removed");
    return NextResponse.json({ removed: true });
  }

  const { error } = await admin.from("tenant_communication_provider_configs").upsert({
    tenant_id: context.tenant.id,
    channel: "email",
    provider: "resend",
    encrypted_api_key: encryptApiKey(apiKey),
    key_last_four: getKeyLastFour(apiKey),
    from_name: parsed.data.fromName,
    from_email: parsed.data.fromEmail,
    reply_to_email: parsed.data.replyToEmail || null,
    connection_status: existing?.connection_status === "connected" && !parsed.data.apiKey ? "connected" : "pending",
    verification_status: existing?.verification_status ?? "unverified",
    is_active: true,
    updated_by: context.user.id,
    created_by: existing?.created_by ?? context.user.id,
    updated_at: now
  }, { onConflict: "tenant_id,channel,provider" });
  if (error) return NextResponse.json({ error: "Unable to save the email provider configuration." }, { status: 500 });
  await audit("email_provider.saved");
  return NextResponse.json({ saved: true });
}
