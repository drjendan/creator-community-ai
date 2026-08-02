import { notFound } from "next/navigation";
import { MemberDirectoryManager } from "@/components/dashboard/MemberDirectoryManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function MembersPage() { if (!(await getActiveTenantWithPermission("tenant.members.view"))) notFound(); return <MemberDirectoryManager />; }
