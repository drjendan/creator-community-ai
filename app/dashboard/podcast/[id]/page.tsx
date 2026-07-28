import Image from "next/image";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { EpisodeStatusBadge } from "@/components/podcast/EpisodeStatusBadge";
import { getEpisodeById } from "@/lib/mock/podcastos";

export default async function PodcastEpisodeDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = getEpisodeById(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-square w-full">
            <Image
              src={episode.coverImageUrl}
              alt={`${episode.title} cover image`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 320px"
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <EpisodeStatusBadge status={episode.status} />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-500">
              Episode {episode.episodeNumber}
            </p>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold text-brand-900">{episode.title}</h1>
          <p className="mt-4 text-sm leading-7 text-brand-700">{episode.description}</p>
          <p className="mt-4 text-xs text-brand-500">
            Publish date: {episode.publishDate} • Duration: {episode.duration} • Plays: {episode.plays.toLocaleString()}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-2xl font-semibold text-brand-900">Audio player</h2>
        <div className="mt-3 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-brand-600">
          Audio URL placeholder: {episode.audioUrl}
        </div>
      </Card>

      {episode.videoUrl && (
        <Card>
          <h2 className="font-display text-2xl font-semibold text-brand-900">Video</h2>
          <div className="mt-3 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-brand-600">
            Video embed placeholder: {episode.videoUrl}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-2xl font-semibold text-brand-900">Transcript</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-brand-700">{episode.transcript}</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl font-semibold text-brand-900">Episode resources</h2>
          <ul className="mt-3 space-y-2 text-sm text-brand-700">
            {episode.resources.map((resource) => (
              <li key={resource.label} className="rounded-lg border border-brand-200 p-3">{resource.label}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-2xl font-semibold text-brand-900">Discussion area</h2>
          <p className="mt-3 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-brand-600">
            Member discussion thread placeholder. Supabase-backed comments will be wired in a later phase.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-2xl font-semibold text-brand-900">AI-generated content</h2>
        <p className="mt-3 rounded-lg border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-brand-600">
          Placeholder for episode summary, key takeaways, reflection questions, and social captions generated from approved content.
        </p>
      </Card>
    </div>
  );
}
