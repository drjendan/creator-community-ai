import { notFound } from "next/navigation";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import { getPlatformBillingSummary } from "@/lib/dashboard-data";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { terminology } from "@/lib/terminology";
import { updatePlatformPlanStripePrices } from "./actions";

export default async function PlatformBillingPage() {
  const actor = await getPlatformAdministrator("platform.billing.view");
  if (!actor) notFound();
  const canManage = actor.permissions.has("platform.billing.manage");
  const data = await getPlatformBillingSummary();
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Platform Operations</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">{terminology.billingAndUsage}</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-600">
          Review subscription states and configure the live Stripe Price IDs used by tenant checkout.
        </p>
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm font-semibold text-warning-strong">
        Revenue totals are not inferred from subscription records. Reconcile financial reporting against Stripe before relying on it.
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Billing & Usage summary">
        <StatCard label="Tenant Subscriptions" value={data.totalSubscriptions} />
        <StatCard label="Active" value={data.statusCounts.active ?? 0} />
        <StatCard label="Trialing" value={data.statusCounts.trialing ?? 0} />
        <StatCard label="AI Tokens Recorded" value={data.totalAiTokens} />
      </section>

      <Card>
        <CardTitle>{terminology.plansAndEntitlements}</CardTitle>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-100 text-brand-700">
              <tr><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tenants</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stripe Price IDs</th></tr>
            </thead>
            <tbody>
              {data.plans.map((plan) => (
                <tr key={plan.id} className="border-t border-brand-100">
                  <td className="px-4 py-3"><p className="font-bold text-brand-900">{plan.name}</p><p className="text-xs text-brand-500">{plan.slug}</p></td>
                  <td className="px-4 py-3 capitalize">{plan.status}</td>
                  <td className="px-4 py-3">{plan.tenantCount}</td>
                  <td className="px-4 py-3">{plan.price_monthly == null ? "Not configured" : formatCurrency(Number(plan.price_monthly), plan.currency)}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <form action={updatePlatformPlanStripePrices} className="grid min-w-64 gap-2">
                        <input type="hidden" name="planId" value={plan.id} />
                        <Input name="monthlyPriceId" defaultValue={plan.stripe_monthly_price_id ?? ""} aria-label={`${plan.name} monthly Stripe Price ID`} placeholder="price_monthly" />
                        <Input name="annualPriceId" defaultValue={plan.stripe_annual_price_id ?? ""} aria-label={`${plan.name} annual Stripe Price ID`} placeholder="price_annual" />
                        <Button type="submit" size="sm">Save Stripe IDs</Button>
                      </form>
                    ) : <span className="text-xs text-brand-500">{plan.stripe_monthly_price_id || plan.stripe_annual_price_id ? "Configured" : "Not configured"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card id="usage">
        <CardTitle>Usage Summary</CardTitle>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-brand-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-brand-500">Configured Monthly AI Allowance</dt><dd className="mt-2 text-2xl font-extrabold text-brand-900">{data.totalAiAllowance.toLocaleString()}</dd></div>
          <div className="rounded-xl bg-brand-50 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-brand-500">Recorded AI Tokens</dt><dd className="mt-2 text-2xl font-extrabold text-brand-900">{data.totalAiTokens.toLocaleString()}</dd></div>
        </dl>
      </Card>
    </div>
  );
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}
