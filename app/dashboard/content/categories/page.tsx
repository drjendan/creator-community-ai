import { notFound } from "next/navigation";
import { ContentConfigurationManager } from "@/components/dashboard/ContentConfigurationManager";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function ContentCategoriesPage() {
  if (!(await getActiveTenantWithPermission("tenant.content.manage"))) notFound();
  return <ContentConfigurationManager mode="categories" />;
}
