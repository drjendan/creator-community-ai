import { notFound } from "next/navigation";
import { DomainManager } from "@/components/dashboard/DomainManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function DomainSettingsPage() {
  if (!(await getActiveTenantWithPermission("tenant.domains.manage"))) notFound();
  return <DomainManager />;
}
