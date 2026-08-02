import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerPortal, createSubscriptionCheckout } from "@/lib/stripe-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { stripeBillingEnabled } from "@/lib/env";

const schema = z.object({ action: z.enum(["checkout", "portal"]), planSlug: z.string().trim().max(80).optional(), interval: z.enum(["month", "year"]).default("month") });

export async function POST(request: NextRequest) {
  if (!stripeBillingEnabled()) return NextResponse.json({ error: "Online billing is not enabled yet. Contact UpNexx for assisted plan changes." }, { status: 503 });
  const context = await getActiveTenantWithPermission("tenant.billing.manage");
  if (!context) return NextResponse.json({ error: "Tenant billing management permission is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid billing action." }, { status: 400 });
  const admin = createAdminClient();
  const { data: subscription } = await admin.from("tenant_subscriptions").select("id,stripe_customer_id,stripe_subscription_id").eq("tenant_id", context.tenant.id).maybeSingle();
  const returnUrl = new URL("/dashboard/billing", process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).toString();
  if (parsed.data.action === "portal") {
    if (!subscription?.stripe_customer_id) return NextResponse.json({ error: "No Stripe billing profile is available for this tenant." }, { status: 409 });
    const portal = await createCustomerPortal({ customerId: subscription.stripe_customer_id, returnUrl });
    return NextResponse.json({ url: portal.url });
  }
  if (!parsed.data.planSlug) return NextResponse.json({ error: "Choose a platform plan." }, { status: 400 });
  const { data: plan } = await admin.from("platform_plans").select("id,name,slug,status,stripe_monthly_price_id,stripe_annual_price_id").eq("slug", parsed.data.planSlug).eq("status", "active").maybeSingle();
  if (!plan || ["trial", "complimentary", "custom", "enterprise"].includes(plan.slug)) return NextResponse.json({ error: "This platform plan requires assisted billing." }, { status: 409 });
  const priceId = parsed.data.interval === "year" ? plan.stripe_annual_price_id : plan.stripe_monthly_price_id;
  if (!priceId) return NextResponse.json({ error: `Stripe ${parsed.data.interval === "year" ? "annual" : "monthly"} pricing is not configured for ${plan.name}.` }, { status: 409 });
  const checkout = await createSubscriptionCheckout({
    priceId,
    successUrl: new URL("/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}", process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).toString(),
    cancelUrl: new URL("/dashboard/billing?checkout=canceled", process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).toString(),
    customerId: subscription?.stripe_customer_id,
    customerEmail: context.user.email,
    tenantId: context.tenant.id,
    metadata: { scope: "platform", plan_id: plan.id, interval: parsed.data.interval },
    idempotencyKey: `platform-checkout-${context.tenant.id}-${plan.id}-${randomUUID()}`
  });
  const pending = { tenant_id: context.tenant.id, plan_id: plan.id, stripe_checkout_session_id: checkout.id, billing_frequency: parsed.data.interval === "year" ? "annual" : "monthly", updated_at: new Date().toISOString() };
  const save = subscription ? await admin.from("tenant_subscriptions").update(pending).eq("id", subscription.id) : await admin.from("tenant_subscriptions").insert({ ...pending, status: "incomplete" });
  if (save.error) return NextResponse.json({ error: "Checkout was created, but its pending state could not be recorded. Contact support before retrying." }, { status: 500 });
  return NextResponse.json({ url: checkout.url });
}
