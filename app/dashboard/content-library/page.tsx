import { notFound } from "next/navigation";
import { ContentLibraryManager } from "@/components/dashboard/ContentLibraryManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function ContentLibraryPage() {
  if (!(await getActiveTenantWithPermission("tenant.content.view"))) notFound();
  return <ContentLibraryManager />;
}
