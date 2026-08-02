import { notFound } from "next/navigation";
import { Button, Container } from "@/components/ui";
import { CommunitySpaceDiscussions } from "@/components/tenant/CommunitySpaceDiscussions";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function CommunitySpacePage({ params }: { params: Promise<{ "tenant-slug": string; "space-id": string }> }) {
  const { "tenant-slug": tenantSlug, "space-id": spaceId } = await params;
  if (!(await tenantHasFeature(tenantSlug, "community"))) notFound();
  return <main className="py-14"><Container><Button href={`/demo/${tenantSlug}/community`} variant="ghost">← All spaces</Button><div className="mt-6"><CommunitySpaceDiscussions tenantSlug={tenantSlug} spaceId={spaceId} /></div></Container></main>;
}
