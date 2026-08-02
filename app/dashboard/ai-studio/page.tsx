import { CreatorAiStudio } from "@/components/dashboard/CreatorAiStudio";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function CreatorAiStudioPage() {
  const [feature, context] = await Promise.all([requireTenantFeature("creator_ai_studio"), getActiveTenantWithPermission("tenant.ai.use")]);
  if (!feature || !context) notFound();
  return <CreatorAiStudio />;
}
