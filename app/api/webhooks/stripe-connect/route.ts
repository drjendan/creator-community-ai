import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeAccountValues, type StripeAccountSnapshot } from "@/lib/stripe-connect";
import { verifyStripeSignature, type StripeEvent } from "@/lib/stripe-webhook";
import { stripeBillingEnabled } from "@/lib/env";

function text(value: unknown) { return typeof value === "string" ? value : null; }
function unixDate(value: unknown) { return typeof value === "number" ? new Date(value * 1000).toISOString() : null; }
async function checked(operation: PromiseLike<{ error: { message: string } | null }>) {
  const result = await operation;
  if (result.error) throw new Error(result.error.message);
}

export async function POST(request: NextRequest) {
  if (!stripeBillingEnabled()) return NextResponse.json({ error: "Stripe integration is currently disabled." }, { status: 503 });
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature") ?? "", secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  let event: StripeEvent;
  try { event = JSON.parse(payload) as StripeEvent; } catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }
  if (!event.id || !event.type || !event.data?.object?.id) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const admin = createAdminClient();
  const object = event.data.object;
  const accountId = event.account ?? (event.type.startsWith("account.") ? object.id : null);
  const metadata = object.metadata ?? {};
  let tenantId = metadata.tenant_id ?? null;
  if (!tenantId && accountId) {
    const { data } = await admin.from("tenant_stripe_accounts").select("tenant_id").eq("stripe_account_id", accountId).maybeSingle();
    tenantId = data?.tenant_id ?? null;
  }
  if (!tenantId) return NextResponse.json({ received: true, ignored: true });
  const { error: eventInsertError } = await admin.from("billing_events").insert({ tenant_id: tenantId, provider_event_id: event.id, event_type: event.type, payload: { object_id: object.id, account: accountId, livemode: event.livemode }, status: "processing", scope: event.type.startsWith("account.") ? "connect" : "member", stripe_account_id: accountId });
  if (eventInsertError?.code === "23505") {
    const { data: reclaimed, error: reclaimError } = await admin.from("billing_events").update({ status: "processing", processing_error: null, processed_at: null, updated_at: new Date().toISOString() }).eq("provider_event_id", event.id).eq("status", "failed").select("id").maybeSingle();
    if (reclaimError) return NextResponse.json({ error: "Unable to reclaim the billing event." }, { status: 500 });
    if (!reclaimed) return NextResponse.json({ received: true, duplicate: true });
  }
  if (eventInsertError) return NextResponse.json({ error: "Unable to record the billing event." }, { status: 500 });
  try {
    if (event.type === "account.updated") {
      await checked(admin.from("tenant_stripe_accounts").update(stripeAccountValues(object as StripeAccountSnapshot)).eq("stripe_account_id", object.id));
    } else if (event.type === "account.application.deauthorized") {
      await checked(admin.from("tenant_stripe_accounts").update({ status: "disconnected", charges_enabled: false, payouts_enabled: false, disconnected_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("stripe_account_id", accountId));
    } else if (event.type === "checkout.session.completed" && metadata.scope === "member") {
      await checked(admin.from("member_subscriptions").update({ stripe_customer_id: text(object.customer), stripe_subscription_id: text(object.subscription), provider_subscription_id: text(object.subscription), status: "incomplete", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("user_id", metadata.user_id).eq("stripe_checkout_session_id", object.id));
    } else if (event.type.startsWith("customer.subscription.")) {
      const values = { tenant_id: tenantId, user_id: metadata.user_id, plan_id: metadata.plan_id, stripe_subscription_id: object.id, provider_subscription_id: object.id, stripe_customer_id: text(object.customer), status: event.type === "customer.subscription.deleted" ? "canceled" : text(object.status) ?? "incomplete", renewal_at: unixDate(object.current_period_end), current_period_end: unixDate(object.current_period_end), cancel_at_period_end: Boolean(object.cancel_at_period_end), billing_interval: metadata.interval ?? null, updated_at: new Date().toISOString() };
      const { data: existing } = await admin.from("member_subscriptions").select("id").eq("stripe_subscription_id", object.id).maybeSingle();
      if (existing) await checked(admin.from("member_subscriptions").update(values).eq("id", existing.id));
      else if (metadata.user_id && metadata.plan_id) await checked(admin.from("member_subscriptions").insert(values));
    } else if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
      const subscriptionId = text(object.subscription);
      const { data: subscription } = subscriptionId ? await admin.from("member_subscriptions").select("id,user_id,plan_id").eq("tenant_id", tenantId).eq("stripe_subscription_id", subscriptionId).maybeSingle() : { data: null };
      if (subscription) {
        const paid = event.type === "invoice.paid";
        await checked(admin.from("member_subscriptions").update({ latest_invoice_status: paid ? "paid" : "payment_failed", ...(paid ? { status: "active" } : {}), updated_at: new Date().toISOString() }).eq("id", subscription.id));
        const paymentValues = { tenant_id: tenantId, user_id: subscription.user_id, plan_id: subscription.plan_id, member_subscription_id: subscription.id, amount: Number(object.amount_paid ?? object.amount_due ?? 0) / 100, currency: String(object.currency ?? "usd").toUpperCase(), provider_payment_id: text(object.payment_intent) ?? object.id, stripe_invoice_id: object.id, status: paid ? "paid" : "failed", updated_at: new Date().toISOString() };
        const { data: existingPayment } = await admin.from("payments").select("id").eq("tenant_id", tenantId).eq("stripe_invoice_id", object.id).maybeSingle();
        if (existingPayment) await checked(admin.from("payments").update(paymentValues).eq("id", existingPayment.id));
        else await checked(admin.from("payments").insert(paymentValues));
      }
    }
    await checked(admin.from("billing_events").update({ status: "processed", processed_at: new Date().toISOString(), processing_error: null, updated_at: new Date().toISOString() }).eq("provider_event_id", event.id));
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("billing_events").update({ status: "failed", processing_error: error instanceof Error ? error.message.slice(0, 1000) : "Unexpected processing error", updated_at: new Date().toISOString() }).eq("provider_event_id", event.id);
    return NextResponse.json({ error: "Billing event processing failed." }, { status: 500 });
  }
}
