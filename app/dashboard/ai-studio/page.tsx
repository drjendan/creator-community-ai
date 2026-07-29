import { CreatorAiStudio } from "@/components/dashboard/CreatorAiStudio";
import { notFound } from "next/navigation";
import { requireTenantFeature } from "@/lib/feature-entitlements";

export default async function CreatorAiStudioPage() {
  if (!(await requireTenantFeature("creator_ai_studio"))) notFound();
  return <CreatorAiStudio />;
}
