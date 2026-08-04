import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeBillingEnabled } from "@/lib/env";
import { paymentFeatureFlags } from "@/lib/community-settings";
import {
  canAcceptPayments, createConnectState, createStandardConnectUrl,
  deauthorizeStandardAccount, retrieveConnectedAccount, stripeAccountValues
} from "@/lib/stripe-connect";

const actionSchema = z.object({ action: z.enum(["start", "resume", "disconnect"]) });

export async function GET() {
  const context = await getActiveTenantWithPermission("tenant.billing.manage");
  if (!context) return NextResponse.json({ error: "Tenant administrator access is required." }, { status: 403 });
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("tenant_stripe_accounts")
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();
  let account = existing;
  if (stripeBillingEnabled() && paymentFeatureFlags().stripeConnect && existing?.stripe_account_id && process.env.STRIPE_SECRET_KEY) {
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
    providerConfigured: stripeBillingEnabled() && paymentFeatureFlags().stripeConnect && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_CLIENT_ID && process.env.STRIPE_CONNECT_STATE_SECRET)
  });
}

export async function POST(request: NextRequest) {
  if (!stripeBillingEnabled() || !paymentFeatureFlags().stripeConnect) return NextResponse.json({ error: "Stripe integration is deferred and currently disabled." }, { status: 503 });
  const context = await getActiveTenantWithPermission("tenant.billing.manage");
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
    if (existing?.stripe_account_id) {
      try {
        await deauthorizeStandardAccount(existing.stripe_account_id);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe account disconnection failed." }, { status: 502 });
      }
    }
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
    const applicationUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!applicationUrl) throw new Error("The canonical application URL is not configured.");
    const callbackUrl = new URL("/api/stripe/connect/callback", applicationUrl).toString();
    const state = createConnectState(context.tenant.id, context.user.id);
    const url = createStandardConnectUrl(state, callbackUrl, context.user.email ?? "");
    await admin.from("audit_logs").insert({
      tenant_id: context.tenant.id, user_id: context.user.id,
      action: "tenant.stripe.onboarding_started", entity_type: "tenant_stripe_account",
      metadata: { resumed: Boolean(existing?.stripe_account_id), account_type: "standard" }
    });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe onboarding could not be started." }, { status: 502 });
  }
}
