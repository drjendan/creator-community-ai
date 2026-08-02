"use client";

import Link from "next/link";
import { CalendarDays, Clock3, Headphones, PlayCircle, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, Input } from "@/components/ui";
import type { MemberEpisode } from "@/lib/content/member-episodes";
import { formatDate } from "@/lib/format";

export function MemberEpisodeGrid({ episodes, tenantSlug }: { episodes: MemberEpisode[]; tenantSlug: string }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const topics = useMemo(() => [...new Set(episodes.flatMap((episode) => episode.topics))].sort(), [episodes]);
  const filtered = useMemo(
    () => episodes.filter((episode) => {
      const matchesQuery = `${episode.title} ${episode.description} ${episode.showNotes} ${episode.topics.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (topic === "all" || episode.topics.includes(topic));
    }),
    [episodes, query, topic]
  );

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 md:flex-row"><label className="relative block max-w-xl flex-1">
        <span className="sr-only">Search episodes</span>
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-brand-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search episodes, notes, and topics" className="pl-11" />
      </label><select aria-label="Filter by topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700"><option value="all">All topics</option>{topics.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      <p className="mt-5 text-sm text-brand-500">{filtered.length} episode{filtered.length === 1 ? "" : "s"}</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((episode) => (
          <Link key={episode.id} href={`/demo/${tenantSlug}/episodes/${episode.id}`}>
            <Card className="h-full transition hover:-translate-y-1 hover:shadow-pop">
              <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-brand-900 text-white" style={episode.coverImageUrl ? { backgroundImage: `linear-gradient(rgb(0 0 0 / .35),rgb(0 0 0 / .35)),url(${episode.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                {episode.videoUrl ? <PlayCircle className="h-12 w-12 text-highlight-300" /> : <Headphones className="h-12 w-12 text-highlight-300" />}
                {episode.featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-highlight-300 px-2 py-1 text-[10px] font-extrabold uppercase text-brand-900"><Star className="h-3 w-3" /> Featured</span>}
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-accent-700">{episode.seasonNumber ? `Season ${episode.seasonNumber} · ` : ""}{episode.episodeNumber ? `Episode ${episode.episodeNumber}` : episode.videoUrl ? "Video episode" : "Audio episode"}</p>
              <h2 className="mt-2 font-display text-xl font-bold text-brand-900">{episode.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-600">{episode.description || "Watch this member episode."}</p>
              {!!episode.topics.length && <div className="mt-3 flex flex-wrap gap-1">{episode.topics.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-700">{item}</span>)}</div>}
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-brand-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(episode.publishDate)}</span>{episode.durationSeconds && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDuration(episode.durationSeconds)}</span>}</div>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="mt-8 rounded-xl border border-brand-200 bg-white p-8 text-center text-brand-500">No episodes matched your search.</p>}
    </>
  );
}

function formatDuration(seconds: number) { const minutes = Math.round(seconds / 60); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }


