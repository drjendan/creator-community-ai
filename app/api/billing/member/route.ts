import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantMemberContext } from "@/lib/communications/member-context";
import { canAcceptPayments } from "@/lib/stripe-connect";
import { createCustomerPortal, createSubscriptionCheckout } from "@/lib/stripe-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeBillingEnabled } from "@/lib/env";

const schema = z.object({
  tenantSlug: z.string().trim().min(2).max(100),
  planId: z.string().uuid().optional(),
  interval: z.enum(["month", "year"]).default("month"),
  action: z.enum(["subscribe", "portal"]).default("subscribe")
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid membership plan." }, { status: 400 });
  const context = await getTenantMemberContext(parsed.data.tenantSlug);
  if (!context) return NextResponse.json({ error: "Sign in as an active member of this organization." }, { status: 401 });
  const admin = createAdminClient();
  const { data: existingRows } = await admin.from("member_subscriptions").select("id,plan_id,status,stripe_customer_id,stripe_subscription_id").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id).order("created_at", { ascending: false }).limit(1);
  const existing = existingRows?.[0] ?? null;
  const returnUrl = new URL(`/demo/${context.tenant.slug}/welcome`, process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).toString();
  if (parsed.data.action === "portal") {
    if (!stripeBillingEnabled()) return NextResponse.json({ error: "Online billing is not enabled yet." }, { status: 503 });
    if (!existing?.stripe_customer_id) return NextResponse.json({ error: "No Stripe billing profile is available." }, { status: 409 });
    const { data: stripe } = await admin.from("tenant_stripe_accounts").select("stripe_account_id").eq("tenant_id", context.tenant.id).maybeSingle();
    if (!stripe?.stripe_account_id) return NextResponse.json({ error: "This organization is not connected to Stripe." }, { status: 409 });
    const portal = await createCustomerPortal({ customerId: existing.stripe_customer_id, returnUrl, accountId: stripe.stripe_account_id });
    return NextResponse.json({ url: portal.url });
  }
  if (!parsed.data.planId) return NextResponse.json({ error: "Choose a membership plan." }, { status: 400 });
  const [{ data: plan }, { data: stripe }] = await Promise.all([
    admin.from("tenant_membership_plans").select("id,name,plan_type,status,visibility,trial_days,stripe_monthly_price_id,stripe_annual_price_id").eq("tenant_id", context.tenant.id).eq("id", parsed.data.planId).eq("status", "active").eq("visibility", "public").maybeSingle(),
    admin.from("tenant_stripe_accounts").select("stripe_account_id,charges_enabled,card_payments_status,platform_fee_active").eq("tenant_id", context.tenant.id).maybeSingle()
  ]);
  if (!plan) return NextResponse.json({ error: "This membership plan is not available." }, { status: 404 });
  if (plan.plan_type === "free") {
    const values = { tenant_id: context.tenant.id, user_id: context.user.id, plan_id: plan.id, status: "active", starts_at: new Date().toISOString(), renewal_at: null, updated_at: new Date().toISOString() };
    const result = existing
      ? await admin.from("member_subscriptions").update(values).eq("id", existing.id).select("id,status").single()
      : await admin.from("member_subscriptions").insert(values).select("id,status").single();
    if (result.error) return NextResponse.json({ error: "Unable to activate the free membership." }, { status: 500 });
    await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: "member.subscription.free_activated", entity_type: "member_subscription", entity_id: result.data.id, metadata: { plan_id: plan.id } });
    return NextResponse.json({ activated: true });
  }
  if (!stripeBillingEnabled()) return NextResponse.json({ error: "Paid memberships are not available yet. Free memberships remain available." }, { status: 503 });
  if (!stripe?.stripe_account_id || !canAcceptPayments(stripe)) return NextResponse.json({ error: "Paid memberships are temporarily unavailable because payment setup is incomplete." }, { status: 409 });
  const priceId = parsed.data.interval === "year" ? plan.stripe_annual_price_id : plan.stripe_monthly_price_id;
  if (!priceId) return NextResponse.json({ error: `This plan does not offer ${parsed.data.interval === "year" ? "annual" : "monthly"} billing.` }, { status: 409 });
  if (existing && ["active", "trialing"].includes(existing.status) && existing.plan_id === plan.id) return NextResponse.json({ error: "This membership is already active. Use Manage billing instead." }, { status: 409 });
  const base = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const checkout = await createSubscriptionCheckout({
    priceId,
    successUrl: new URL(`/demo/${context.tenant.slug}/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`, base).toString(),
    cancelUrl: new URL(`/demo/${context.tenant.slug}/membership?checkout=canceled`, base).toString(),
    customerId: existing?.stripe_customer_id,
    customerEmail: context.user.email,
    tenantId: context.tenant.id,
    metadata: { scope: "member", user_id: context.user.id, plan_id: plan.id, interval: parsed.data.interval },
    accountId: stripe.stripe_account_id,
    applicationFeeBps: Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? "0"),
    trialDays: Number(plan.trial_days ?? 0),
    idempotencyKey: `member-checkout-${context.tenant.id}-${context.user.id}-${plan.id}-${randomUUID()}`
  });
  const pending = { tenant_id: context.tenant.id, user_id: context.user.id, plan_id: plan.id, status: "incomplete", stripe_checkout_session_id: checkout.id, billing_interval: parsed.data.interval, updated_at: new Date().toISOString() };
  const save = existing ? await admin.from("member_subscriptions").update(pending).eq("id", existing.id) : await admin.from("member_subscriptions").insert(pending);
  if (save.error) return NextResponse.json({ error: "Checkout was created, but the pending subscription could not be recorded. Contact support before retrying." }, { status: 500 });
  return NextResponse.json({ url: checkout.url });
}
