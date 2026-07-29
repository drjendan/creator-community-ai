import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
export default async function CoursesPage() { if (!(await requireTenantFeature("courses"))) notFound(); return <TenantContentManager type="courses" />; }
