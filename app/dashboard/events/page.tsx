import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
export default async function EventsPage() { if (!(await requireTenantFeature("events"))) notFound(); return <TenantContentManager type="events" />; }
