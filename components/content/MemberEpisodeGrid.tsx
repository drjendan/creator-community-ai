"use client";

import Link from "next/link";
import { CalendarDays, PlayCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, Input } from "@/components/ui";
import type { MemberEpisode } from "@/lib/content/member-episodes";
import { formatDate } from "@/lib/format";

export function MemberEpisodeGrid({ episodes, tenantSlug }: { episodes: MemberEpisode[]; tenantSlug: string }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => episodes.filter((episode) => `${episode.title} ${episode.description}`.toLowerCase().includes(query.toLowerCase())),
    [episodes, query]
  );

  return (
    <>
      <label className="relative mt-8 block max-w-xl">
        <span className="sr-only">Search episodes</span>
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-brand-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the video library" className="pl-11" />
      </label>
      <p className="mt-5 text-sm text-brand-500">{filtered.length} episode{filtered.length === 1 ? "" : "s"}</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((episode, index) => (
          <Link key={episode.id} href={`/demo/${tenantSlug}/episodes/${episode.id}`}>
            <Card className="h-full transition hover:-translate-y-1 hover:shadow-pop">
              <div className="grid aspect-video place-items-center rounded-xl bg-brand-900 text-white">
                <PlayCircle className="h-12 w-12 text-highlight-300" />
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-accent-700">Episode {episodes.length - index}</p>
              <h2 className="mt-2 font-display text-xl font-bold text-brand-900">{episode.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-600">{episode.description || "Watch this member episode."}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(episode.publishDate)}</p>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="mt-8 rounded-xl border border-brand-200 bg-white p-8 text-center text-brand-500">No episodes matched your search.</p>}
    </>
  );
}


