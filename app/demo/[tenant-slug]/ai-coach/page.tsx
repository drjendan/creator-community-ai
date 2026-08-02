import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { MemberAiCoach } from "@/components/tenant/MemberAiCoach";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function AiCoachPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params;
  if (!(await tenantHasFeature(tenantSlug, "ai_coach"))) notFound();
  return <main className="py-14"><Container><MemberAiCoach tenantSlug={tenantSlug} /></Container></main>;
}
