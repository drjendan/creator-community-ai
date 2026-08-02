import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature") ?? "", secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  let event: StripeEvent;
  try { event = JSON.parse(payload) as StripeEvent; } catch { return NextResponse.json({ error: "Invalid payload." }, { status: 400 }); }
  const object = event.data?.object;
  if (!event.id || !event.type || !object?.id) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const admin = createAdminClient();
  const metadata = object.metadata ?? {};
  const referencedSubscription = event.type.startsWith("customer.subscription.") ? object.id : text(object.subscription);
  let tenantId = metadata.tenant_id ?? null;
  if (!tenantId && referencedSubscription) {
    const { data } = await admin.from("tenant_subscriptions").select("tenant_id").eq("stripe_subscription_id", referencedSubscription).maybeSingle();
    tenantId = data?.tenant_id ?? null;
  }
  if (!tenantId) return NextResponse.json({ received: true, ignored: true });
  const { error: insertError } = await admin.from("billing_events").insert({ tenant_id: tenantId, provider_event_id: event.id, event_type: event.type, payload: { object_id: object.id, livemode: event.livemode }, status: "processing", scope: "platform" });
  if (insertError?.code === "23505") {
    const { data: reclaimed, error: reclaimError } = await admin.from("billing_events").update({ status: "processing", processing_error: null, processed_at: null, updated_at: new Date().toISOString() }).eq("provider_event_id", event.id).eq("status", "failed").select("id").maybeSingle();
    if (reclaimError) return NextResponse.json({ error: "Unable to reclaim the billing event." }, { status: 500 });
    if (!reclaimed) return NextResponse.json({ received: true, duplicate: true });
  }
  if (insertError) return NextResponse.json({ error: "Unable to record the billing event." }, { status: 500 });
  try {
    if (event.type === "checkout.session.completed" && metadata.scope === "platform") {
      await checked(admin.from("tenant_subscriptions").update({ stripe_customer_id: text(object.customer), provider_customer_id: text(object.customer), stripe_subscription_id: text(object.subscription), provider_subscription_id: text(object.subscription), status: "incomplete", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("stripe_checkout_session_id", object.id));
    } else if (event.type.startsWith("customer.subscription.")) {
      const status = event.type === "customer.subscription.deleted" ? "canceled" : text(object.status) ?? "incomplete";
      const values = { stripe_subscription_id: object.id, provider_subscription_id: object.id, stripe_customer_id: text(object.customer), provider_customer_id: text(object.customer), status, current_period_end: unixDate(object.current_period_end), renewal_at: unixDate(object.current_period_end), cancel_at_period_end: Boolean(object.cancel_at_period_end), latest_invoice_status: null, updated_at: new Date().toISOString() };
      await checked(admin.from("tenant_subscriptions").update(values).eq("tenant_id", tenantId));
      if (["past_due", "unpaid", "canceled", "incomplete_expired"].includes(status)) {
        await checked(admin.from("tenants").update({ status: "suspended", suspended_at: new Date().toISOString(), suspension_reason: `billing:${status}`, updated_at: new Date().toISOString() }).eq("id", tenantId).eq("status", "active"));
      } else if (["active", "trialing"].includes(status)) {
        const { data: tenant } = await admin.from("tenants").select("suspension_reason").eq("id", tenantId).maybeSingle();
        if (tenant?.suspension_reason?.startsWith("billing:")) await checked(admin.from("tenants").update({ status: "active", suspended_at: null, suspended_by: null, suspension_reason: null, updated_at: new Date().toISOString() }).eq("id", tenantId));
      }
    } else if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
      const paid = event.type === "invoice.paid";
      await checked(admin.from("tenant_subscriptions").update({ latest_invoice_status: paid ? "paid" : "payment_failed", ...(paid ? { status: "active" } : {}), updated_at: new Date().toISOString() }).eq("tenant_id", tenantId));
    }
    await checked(admin.from("billing_events").update({ status: "processed", processed_at: new Date().toISOString(), processing_error: null, updated_at: new Date().toISOString() }).eq("provider_event_id", event.id));
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("billing_events").update({ status: "failed", processing_error: error instanceof Error ? error.message.slice(0, 1000) : "Unexpected processing error", updated_at: new Date().toISOString() }).eq("provider_event_id", event.id);
    return NextResponse.json({ error: "Billing event processing failed." }, { status: 500 });
  }
}
