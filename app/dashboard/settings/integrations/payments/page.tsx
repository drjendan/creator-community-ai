import { notFound } from "next/navigation";
import { StripePaymentsSettings } from "@/components/dashboard/StripePaymentsSettings";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { Card } from "@/components/ui";
import { stripeBillingEnabled } from "@/lib/env";

export default async function PaymentsSettingsPage() {
  if (!await getActiveTenantWithPermission("tenant.billing.manage")) notFound();
  if (!stripeBillingEnabled()) return <Card><h1 className="font-display text-2xl font-bold text-brand-900">Payment integration deferred</h1><p className="mt-2 text-sm text-brand-600">Stripe is intentionally disabled for this production release. No payment setup or checkout is available until the integration is explicitly enabled later.</p></Card>;
  return <StripePaymentsSettings />;
}
