import { BrandingManager } from "@/components/dashboard/BrandingManager";
import { notFound } from "next/navigation";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
export default async function BrandingPage() { if (!(await getActiveTenantAdministrator())) notFound(); return <BrandingManager />; }
