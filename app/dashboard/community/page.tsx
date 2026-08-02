import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { CommunityModerationManager } from "@/components/dashboard/CommunityModerationManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
export default async function CommunityPage() { if (!(await requireTenantFeature("community")) || !(await getActiveTenantWithPermission("tenant.community.manage"))) notFound(); return <div className="space-y-8"><TenantContentManager type="community" /><CommunityModerationManager /></div>; }
