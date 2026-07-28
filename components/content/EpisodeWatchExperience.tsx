"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Download, FileText, ListVideo } from "lucide-react";
import { useState } from "react";
import { VideoPlayer } from "@/components/content/VideoPlayer";
import type { MemberEpisode } from "@/lib/content/member-episodes";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export function EpisodeWatchExperience({
  episode,
  episodes,
  tenantSlug
}: {
  episode: MemberEpisode;
  episodes: MemberEpisode[];
  tenantSlug: string;
}) {
  const [tab, setTab] = useState<"overview" | "transcript" | "resources">("overview");

  return (
    <main className="bg-brand-50">
      <div className="grid min-h-[calc(100vh-112px)] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="bg-black"><VideoPlayer url={episode.videoUrl} title={episode.title} /></div>
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-accent-700">Podcast learning experience</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-brand-900 md:text-4xl">{episode.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-brand-500"><span>{formatDate(episode.publishDate)}</span><span className="capitalize">{episode.accessLevel} access</span></div>

            <div className="mt-8 flex gap-1 border-b border-brand-200" role="tablist">
              {(["overview", "transcript", "resources"] as const).map((item) => (
                <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={cn("border-b-2 px-4 py-3 text-sm font-bold capitalize", tab === item ? "border-accent-600 text-accent-700" : "border-transparent text-brand-500")}>{item}</button>
              ))}
            </div>

            {tab === "overview" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">About this episode</h2><p className="mt-4 whitespace-pre-line leading-7 text-brand-700">{episode.description || "The creator has not added episode notes yet."}</p></section>}
            {tab === "transcript" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">Transcript</h2><div className="mt-4 rounded-xl border border-brand-200 bg-white p-6 whitespace-pre-line text-sm leading-7 text-brand-700">{episode.transcript || "A transcript has not been published for this episode."}</div></section>}
            {tab === "resources" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">Episode resources</h2>{episode.resources.length ? <div className="mt-4 space-y-3">{episode.resources.map((resource) => <a key={resource.url} href={resource.url} className="flex items-center gap-3 rounded-xl border border-brand-200 bg-white p-4 font-bold text-brand-800"><FileText className="h-5 w-5 text-accent-600" />{resource.title}<Download className="ml-auto h-4 w-4" /></a>)}</div> : <p className="mt-4 text-brand-500">No resources have been attached to this episode.</p>}</section>}
          </div>
        </div>

        <aside className="border-l border-brand-200 bg-white xl:max-h-[calc(100vh-112px)] xl:overflow-y-auto">
          <div className="sticky top-0 border-b border-brand-200 bg-white p-5">
            <div className="flex items-center gap-2"><ListVideo className="h-5 w-5 text-accent-700" /><h2 className="font-display text-xl font-bold text-brand-900">Episode library</h2></div>
            <p className="mt-1 text-sm text-brand-500">{episodes.length} videos in this podcast</p>
          </div>
          <div>
            {episodes.map((item, index) => {
              const active = item.id === episode.id;
              return (
                <Link key={item.id} href={`/demo/${tenantSlug}/episodes/${item.id}`} className={cn("flex gap-3 border-b border-brand-100 p-4 transition", active ? "bg-accent-50" : "hover:bg-brand-50")}>
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", active ? "bg-accent-600 text-white" : "bg-brand-100 text-brand-600")}>{active ? <CheckCircle2 className="h-4 w-4" /> : episodes.length - index}</span>
                  <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-bold text-brand-900">{item.title}</span><span className="mt-1 block text-xs text-brand-500">Video episode</span></span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-brand-400" />
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}

