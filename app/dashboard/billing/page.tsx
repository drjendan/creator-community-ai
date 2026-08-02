import { Check, CreditCard } from "lucide-react";
import { Card } from "@/components/ui";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantTrialAccess } from "@/lib/trials";
import { BillingPortalButton, TenantPlatformBillingActions } from "@/components/dashboard/TenantPlatformBillingActions";
import { stripeBillingEnabled } from "@/lib/env";

export default async function BillingPage() {
  const context = await getActiveTenantWithPermission("tenant.billing.manage");
  if (!context) return <p className="text-sm text-brand-600">No organization workspace is available.</p>;
  const admin = createAdminClient();
  const onlineBillingEnabled = stripeBillingEnabled();
  const [subscription, { data: plans }, { data: billingRecord }] = await Promise.all([
    getTenantTrialAccess(context.tenant.id),
    admin.from("platform_plans").select("name,slug,description,price_monthly,price_annual,currency,stripe_monthly_price_id,stripe_annual_price_id").eq("status", "active").not("slug", "in", '("trial","complimentary","custom")').order("price_monthly"),
    admin.from("tenant_subscriptions").select("stripe_customer_id,stripe_subscription_id,status,cancel_at_period_end,latest_invoice_status").eq("tenant_id", context.tenant.id).maybeSingle()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Billing</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Plans and subscription</h1>
        <p className="mt-2 text-sm text-brand-600">Review the current subscription and select the best plan for your organization.</p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-500">Current subscription type</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-brand-900">{subscription.subscriptionType}</h2>
            {subscription.isTrial && <p className="mt-2 text-sm text-brand-600">{subscription.daysRemaining} {subscription.daysRemaining === 1 ? "day" : "days"} remaining · Ends {formatDate(subscription.trialEndsAt)}</p>}
          </div>
          <CreditCard className="h-9 w-9 text-accent-700" />
          {onlineBillingEnabled && billingRecord?.stripe_customer_id && <BillingPortalButton />}
        </div>
      </Card>
      {!onlineBillingEnabled && <Card><p className="font-bold text-brand-900">Online billing is coming later</p><p className="mt-2 text-sm text-brand-600">Stripe is intentionally disabled for this release. Existing access and free memberships continue to work; contact UpNexx for assisted plan changes.</p></Card>}
      <section>
        <h2 className="font-display text-2xl font-bold text-brand-900">Choose a plan</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <Card key={plan.slug} className="flex h-full flex-col">
              <h3 className="font-display text-xl font-bold text-brand-900">{plan.name}</h3>
              <p className="mt-2 min-h-12 text-sm text-brand-600">{plan.description || "UpNexx platform subscription"}</p>
              <p className="mt-4 font-display text-3xl font-extrabold text-brand-900">
                {plan.price_monthly == null ? "Custom" : formatCurrency(Number(plan.price_monthly), plan.currency)}
                {plan.price_monthly != null && <span className="text-sm font-semibold text-brand-500">/month</span>}
              </p>
              <p className="mt-4 flex items-center gap-2 text-sm text-brand-700"><Check className="h-4 w-4 text-success-strong" />Existing tenant data is retained</p>
              {onlineBillingEnabled && <TenantPlatformBillingActions planSlug={plan.slug} monthlyEnabled={Boolean(plan.stripe_monthly_price_id)} annualEnabled={Boolean(plan.stripe_annual_price_id)} />}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not available";
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}
