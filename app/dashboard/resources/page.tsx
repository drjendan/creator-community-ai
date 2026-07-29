import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
export default async function ResourcesPage() { if (!(await requireTenantFeature("resources"))) notFound(); return <TenantContentManager type="resources" />; }
