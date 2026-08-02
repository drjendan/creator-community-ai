import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Milestone 6 production billing contracts", () => {
  const migration = read("supabase/migrations/0022_production_billing.sql");
  const connect = read("lib/stripe-connect.ts");
  const callback = read("app/api/stripe/connect/callback/route.ts");
  const memberBilling = read("app/api/billing/member/route.ts");
  const platformBilling = read("app/api/billing/platform/route.ts");
  const connectWebhook = read("app/api/webhooks/stripe-connect/route.ts");
  const platformWebhook = read("app/api/webhooks/stripe-platform/route.ts");
  const webhookVerifier = read("lib/stripe-webhook.ts");
  const environment = read("lib/env.ts");
  const connectRoute = read("app/api/stripe/connect/route.ts");
  const billingPage = read("app/dashboard/billing/page.tsx");
  const membershipPage = read("app/demo/[tenant-slug]/membership/page.tsx");

  it("adds durable Stripe identifiers and idempotent invoice/event state", () => {
    expect(migration).toContain("stripe_monthly_price_id");
    expect(migration).toContain("stripe_checkout_session_id");
    expect(migration).toContain("processed_at timestamptz");
    expect(migration).toContain("uq_payments_stripe_invoice");
    expect(migration).toContain("uq_member_subscriptions_checkout_session");
  });

  it("uses signed, user-bound Standard Connect OAuth", () => {
    expect(connect).toContain("https://connect.stripe.com/oauth/authorize");
    expect(connect).toContain('url.searchParams.set("scope", "read_write")');
    expect(connect).toContain('createHmac("sha256"');
    expect(connect).toContain("timingSafeEqual");
    expect(connect).not.toContain('type: "express"');
    expect(callback).toContain("user.id !== stateData.userId");
    expect(callback).toContain('tenantPermissions.has("tenant.billing.manage")');
  });

  it("protects platform and member checkout at the server boundary", () => {
    expect(platformBilling).toContain('getActiveTenantWithPermission("tenant.billing.manage")');
    expect(memberBilling).toContain("getTenantMemberContext");
    expect(memberBilling).toContain("canAcceptPayments(stripe)");
    expect(memberBilling).toContain("applicationFeeBps");
    expect(memberBilling).toContain('status: "incomplete"');
  });

  it("verifies raw webhook payloads and deduplicates provider events", () => {
    expect(webhookVerifier).toContain('createHmac("sha256", secret).update(`${timestamp}.${payload}`)');
    for (const route of [connectWebhook, platformWebhook]) {
      expect(route).toContain("await request.text()");
      expect(route).toContain("verifyStripeSignature");
      expect(route.includes('insertError?.code === "23505"') || route.includes('eventInsertError?.code === "23505"')).toBe(true);
      expect(route).toContain('.eq("status", "failed")');
      expect(route).toContain("await checked(");
      expect(route).toContain('status: "processed"');
    }
  });

  it("does not activate checkout-only subscriptions or undo manual suspensions", () => {
    expect(connectWebhook).toContain('event.type === "checkout.session.completed"');
    expect(connectWebhook).toContain('status: "incomplete"');
    expect(connectWebhook).toContain('event.type === "invoice.paid"');
    expect(platformWebhook).toContain('status: "incomplete"');
    expect(platformWebhook).toContain('tenant?.suspension_reason?.startsWith("billing:")');
  });

  it("keeps all billing credentials server-only", () => {
    const env = read(".env.example");
    expect(env).toContain("STRIPE_CONNECT_STATE_SECRET=");
    expect(env).not.toMatch(/NEXT_PUBLIC_STRIPE_(SECRET|WEBHOOK|CONNECT_STATE)/);
  });

  it("keeps deferred Stripe billing explicitly disabled and fail-closed", () => {
    expect(read(".env.example")).toContain("STRIPE_BILLING_ENABLED=false");
    expect(environment).toContain('process.env.STRIPE_BILLING_ENABLED === "true"');
    expect(environment).toContain("stripeBillingEnabled() ? stripeSchema.safeParse(values)");
    for (const route of [platformBilling, memberBilling, connectRoute, callback, connectWebhook, platformWebhook]) {
      expect(route).toContain("stripeBillingEnabled()");
    }
    expect(billingPage).toContain("onlineBillingEnabled && <TenantPlatformBillingActions");
    expect(membershipPage).toContain("paidBillingEnabled={onlineBillingEnabled}");
    expect(memberBilling.indexOf('plan.plan_type === "free"')).toBeLessThan(memberBilling.indexOf("Paid memberships are not available yet"));
  });
});
