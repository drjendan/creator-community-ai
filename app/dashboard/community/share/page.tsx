import { notFound } from "next/navigation";
import { ShareCommunityManager } from "@/components/dashboard/ShareCommunityManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
export default async function ShareCommunityPage(){if(!(await getActiveTenantWithPermission("tenant.members.view")))notFound();return <ShareCommunityManager/>;}
