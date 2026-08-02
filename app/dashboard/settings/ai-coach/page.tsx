import { notFound } from "next/navigation";
import { AiCoachSettingsManager } from "@/components/dashboard/AiCoachSettingsManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function AiCoachSettingsPage() {
  if (!(await getActiveTenantWithPermission("tenant.settings.manage"))) notFound();
  return <AiCoachSettingsManager />;
}
