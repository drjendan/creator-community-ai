import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
export default async function CommunityPage() { if (!(await requireTenantFeature("community"))) notFound(); return <TenantContentManager type="community" />; }
