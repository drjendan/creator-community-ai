import { notFound } from "next/navigation";
import { LegalCenterEditor } from "@/components/legal/LegalCenterEditor";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
export default async function TenantLegalSettingsPage() { if (!(await getActiveTenantAdministrator())) notFound(); return <LegalCenterEditor scope="tenant" />; }
