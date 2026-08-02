import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
export default async function ResourcesPage() { if (!(await requireTenantFeature("resources")) || !(await getActiveTenantWithPermission("tenant.resources.manage"))) notFound(); return <TenantContentManager type="resources" />; }
