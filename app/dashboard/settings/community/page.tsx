import { notFound } from "next/navigation";
import { CommunitySettingsManager } from "@/components/dashboard/CommunitySettingsManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
export default async function CommunitySettingsPage(){if(!(await getActiveTenantWithPermission("tenant.settings.manage")))notFound();return <CommunitySettingsManager/>;}
