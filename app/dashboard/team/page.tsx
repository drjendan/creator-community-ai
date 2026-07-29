import { TeamManager } from "@/components/dashboard/TeamManager";
import { notFound } from "next/navigation";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
export default async function TeamPage() { if (!(await getActiveTenantAdministrator())) notFound(); return <TeamManager />; }
