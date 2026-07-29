import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canAcceptPayments, createConnectedAccount, createOnboardingLink,
  retrieveConnectedAccount, stripeAccountValues
} from "@/lib/stripe-connect";

const actionSchema = z.object({ action: z.enum(["start", "resume", "disconnect"]) });

export async function GET() {
  const context = await getActiveTenantAdministrator();
  if (!context) return NextResponse.json({ error: "Tenant administrator access is required." }, { status: 403 });
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("tenant_stripe_accounts")
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();
  let account = existing;
  if (existing?.stripe_account_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const remote = await retrieveConnectedAccount(existing.stripe_account_id);
      const values = stripeAccountValues(remote);
      const { data } = await admin
        .from("tenant_stripe_accounts")
        .upsert({ tenant_id: context.tenant.id, ...values }, { onConflict: "tenant_id" })
        .select("*")
        .single();
      account = data ?? existing;
    } catch {
      // Preserve the last known status; Stripe outages must not erase configuration.
    }
  }
  return NextResponse.json({
    account: account ?? { status: "not_connected" },
    paymentsEnabled: account ? canAcceptPayments(account) : false,
    providerConfigured: Boolean(process.env.STRIPE_SECRET_KEY)
  });
}

export async function POST(request: NextRequest) {
  const context = await getActiveTenantAdministrator();
  if (!context) return NextResponse.json({ error: "Tenant administrator access is required." }, { status: 403 });
  const admin = createAdminClient();
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid Stripe action." }, { status: 400 });
  const { data: existing } = await admin
    .from("tenant_stripe_accounts")
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();

  if (parsed.data.action === "disconnect") {
    const { error } = await admin.from("tenant_stripe_accounts").upsert({
      tenant_id: context.tenant.id,
      status: "disconnected",
      charges_enabled: false,
      payouts_enabled: false,
      platform_fee_active: false,
      disconnected_at: new Date().toISOString(),
      disconnected_by: context.user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("audit_logs").insert({
      tenant_id: context.tenant.id, user_id: context.user.id,
      action: "tenant.stripe.disconnected", entity_type: "tenant_stripe_account"
    });
    return NextResponse.json({ status: "disconnected" });
  }

  try {
    let accountId = existing?.stripe_account_id as string | null;
    if (!accountId) {
      const account = await createConnectedAccount(context.user.email ?? "");
      accountId = account.id;
      const { error } = await admin.from("tenant_stripe_accounts").upsert({
        tenant_id: context.tenant.id,
        ...stripeAccountValues(account),
        connected_by: context.user.id
      }, { onConflict: "tenant_id" });
      if (error) throw error;
    }
    const origin = request.nextUrl.origin;
    const path = "/dashboard/settings/integrations/payments";
    const link = await createOnboardingLink(accountId, `${origin}${path}?stripe=returned`, `${origin}${path}?stripe=refresh`);
    await admin.from("audit_logs").insert({
      tenant_id: context.tenant.id, user_id: context.user.id,
      action: "tenant.stripe.onboarding_started", entity_type: "tenant_stripe_account",
      metadata: { resumed: Boolean(existing?.stripe_account_id) }
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe onboarding could not be started." }, { status: 502 });
  }
}
