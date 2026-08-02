import { notFound } from "next/navigation";
import { MemberResourceLibrary } from "@/components/tenant/MemberResourceLibrary";
import { Container, SectionHeading } from "@/components/ui";
import { getPublishedResources } from "@/lib/content/member-library";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function ResourcesPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params; if (!(await tenantHasFeature(tenantSlug, "resources"))) notFound(); const resources = await getPublishedResources(tenantSlug);
  return <main className="py-16"><Container><SectionHeading eyebrow="Resource library" title="Tools, guides, and downloads." subtitle="Search practical resources, save favorites, and access the version you need." /><MemberResourceLibrary initialResources={resources} tenantSlug={tenantSlug} /></Container></main>;
}
