import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { MemberResourceDetail } from "@/components/tenant/MemberResourceDetail";
import { Button, Container } from "@/components/ui";
import { getPublishedResource } from "@/lib/content/member-library";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function ResourceDetailPage({ params }: { params: Promise<{ "tenant-slug": string; "resource-id": string }> }) {
  const { "tenant-slug": tenantSlug, "resource-id": resourceId } = await params; if (!(await tenantHasFeature(tenantSlug, "resources"))) notFound(); const resource = await getPublishedResource(tenantSlug, resourceId); if (!resource) notFound();
  return <main className="py-12"><Container><Button href={`/demo/${tenantSlug}/resources`} variant="ghost"><ArrowLeft className="h-4 w-4" /> Back to resources</Button><div className="mt-8"><MemberResourceDetail initialResource={resource} tenantSlug={tenantSlug} /></div></Container></main>;
}
