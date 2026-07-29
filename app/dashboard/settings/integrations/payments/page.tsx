import { notFound } from "next/navigation";
import { StripePaymentsSettings } from "@/components/dashboard/StripePaymentsSettings";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";

export default async function PaymentsSettingsPage() {
  if (!await getActiveTenantAdministrator()) notFound();
  return <StripePaymentsSettings />;
}
