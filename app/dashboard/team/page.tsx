import { TeamManager } from "@/components/dashboard/TeamManager";
import { notFound } from "next/navigation";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
export default async function TeamPage() { if (!(await getActiveTenantWithPermission("tenant.team.view"))) notFound(); return <TeamManager />; }
