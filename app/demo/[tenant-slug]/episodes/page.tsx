import { MemberEpisodeGrid } from "@/components/content/MemberEpisodeGrid";
import { Container, SectionHeading } from "@/components/ui";
import { getPublishedEpisodes } from "@/lib/content/member-episodes";
import { notFound } from "next/navigation";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function EpisodesPage({
  params
}: {
  params: Promise<{ "tenant-slug": string }>;
}) {
  const { "tenant-slug": tenantSlug } = await params;
  if (!(await tenantHasFeature(tenantSlug, "podcasts"))) notFound();
  const episodes = await getPublishedEpisodes(tenantSlug);

  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Member video library" title="Watch and learn" subtitle="Stream podcast episodes, revisit key ideas, and continue through the complete creator library." />
        <MemberEpisodeGrid episodes={episodes} tenantSlug={tenantSlug} />
      </Container>
    </main>
  );
}
