import { notFound } from "next/navigation";
import { EpisodeWatchExperience } from "@/components/content/EpisodeWatchExperience";
import { getPublishedEpisode } from "@/lib/content/member-episodes";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function PodcastViewPage({
  params
}: {
  params: Promise<{ "tenant-slug": string; "episode-id": string }>;
}) {
  const { "tenant-slug": tenantSlug, "episode-id": episodeId } = await params;
  if (!(await tenantHasFeature(tenantSlug, "podcasts"))) notFound();
  const { episode, episodes } = await getPublishedEpisode(tenantSlug, episodeId);
  if (!episode) notFound();

  return <EpisodeWatchExperience episode={episode} episodes={episodes} tenantSlug={tenantSlug} />;
}
