import { notFound } from "next/navigation";
import { DataGovernanceManager } from "@/components/dashboard/DataGovernanceManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function DataGovernancePage() { if (!(await getActiveTenantWithPermission("tenant.data.manage"))) notFound(); return <DataGovernanceManager />; }
