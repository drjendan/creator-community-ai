import { notFound } from "next/navigation";
import { CourseStructureManager } from "@/components/dashboard/CourseStructureManager";
import { requireTenantFeature } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function CourseStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireTenantFeature("courses");
  const permitted = await getActiveTenantWithPermission("tenant.courses.manage");
  if (!context || !permitted || context.tenant.id !== permitted.tenant.id) notFound();
  const { id } = await params;
  return <CourseStructureManager courseId={id} />;
}
