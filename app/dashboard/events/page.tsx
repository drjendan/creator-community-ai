import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
export default async function EventsPage() { if (!(await requireTenantFeature("events")) || !(await getActiveTenantWithPermission("tenant.events.manage"))) notFound(); return <TenantContentManager type="events" />; }
