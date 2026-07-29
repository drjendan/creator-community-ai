import { TenantContentManager } from "@/components/dashboard/TenantContentManager";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";

export default async function PodcastPage() {
  if (!(await requireTenantFeature("podcasts"))) notFound();
  return <TenantContentManager type="episodes" />;
}
