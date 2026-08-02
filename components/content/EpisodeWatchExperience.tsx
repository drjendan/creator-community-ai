"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock3, Download, FileText, Headphones, Lightbulb, ListVideo } from "lucide-react";
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
  const [tab, setTab] = useState<"overview" | "notes" | "transcript" | "resources" | "reflect">("overview");

  return (
    <main className="bg-brand-50">
      <div className="grid min-h-[calc(100vh-112px)] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {episode.videoUrl ? <div className="bg-black"><VideoPlayer url={episode.videoUrl} title={episode.title} /></div> : <div className="grid min-h-56 place-items-center bg-brand-900 px-5 py-12"><div className="w-full max-w-3xl text-center"><Headphones className="mx-auto h-12 w-12 text-highlight-300" /><audio controls className="mt-6 w-full" src={episode.audioUrl}>Your browser does not support audio playback.</audio></div></div>}
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-accent-700">Podcast learning experience</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-brand-900 md:text-4xl">{episode.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-brand-500"><span>{formatDate(episode.publishDate)}</span>{episode.seasonNumber && <span>Season {episode.seasonNumber}</span>}{episode.episodeNumber && <span>Episode {episode.episodeNumber}</span>}{episode.durationSeconds && <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{formatDuration(episode.durationSeconds)}</span>}<span className="capitalize">{episode.accessLevel} access</span></div>
            {!!episode.topics.length && <div className="mt-4 flex flex-wrap gap-2">{episode.topics.map((topic) => <span key={topic} className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-700">{topic}</span>)}</div>}

            <div className="mt-8 flex gap-1 border-b border-brand-200" role="tablist">
              {(["overview", "notes", "transcript", "resources", "reflect"] as const).map((item) => (
                <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={cn("border-b-2 px-4 py-3 text-sm font-bold capitalize", tab === item ? "border-accent-600 text-accent-700" : "border-transparent text-brand-500")}>{item}</button>
              ))}
            </div>

            {tab === "overview" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">About this episode</h2><p className="mt-4 whitespace-pre-line leading-7 text-brand-700">{episode.description || "The creator has not added an episode description yet."}</p>{!!episode.keyTakeaways.length && <div className="mt-7 rounded-xl border border-accent-200 bg-accent-50 p-6"><h3 className="flex items-center gap-2 font-display text-lg font-bold text-brand-900"><Lightbulb className="h-5 w-5 text-accent-700" /> Key takeaways</h3><ul className="mt-4 space-y-3">{episode.keyTakeaways.map((item) => <li key={item} className="flex gap-3 text-brand-700"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" />{item}</li>)}</ul></div>}</section>}
            {tab === "notes" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">Show notes</h2><div className="mt-4 whitespace-pre-line rounded-xl border border-brand-200 bg-white p-6 leading-7 text-brand-700">{episode.showNotes || "Show notes have not been published for this episode."}</div></section>}
            {tab === "transcript" && <section className="py-7"><div className="flex items-center justify-between gap-4"><h2 className="font-display text-2xl font-bold text-brand-900">Transcript</h2>{episode.transcript && episode.transcriptDownloadable && <button type="button" onClick={() => downloadTranscript(episode.title, episode.transcript)} className="inline-flex items-center gap-2 text-sm font-bold text-accent-700"><Download className="h-4 w-4" /> Download</button>}</div><div className="mt-4 whitespace-pre-line rounded-xl border border-brand-200 bg-white p-6 text-sm leading-7 text-brand-700">{episode.transcript || "A transcript has not been published for this episode."}</div></section>}
            {tab === "resources" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">Episode resources</h2>{episode.resources.length ? <div className="mt-4 space-y-3">{episode.resources.map((resource) => <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-brand-200 bg-white p-4 text-brand-800"><FileText className="h-5 w-5 shrink-0 text-accent-600" /><span><span className="block font-bold">{resource.title}</span>{resource.description && <span className="mt-1 block text-sm font-normal text-brand-500">{resource.description}</span>}<span className="mt-1 block text-xs capitalize text-brand-400">{resource.resourceType}</span></span>{resource.allowDownload && <Download className="ml-auto h-4 w-4 shrink-0" />}</a>)}</div> : <p className="mt-4 text-brand-500">No resources have been attached to this episode.</p>}</section>}
            {tab === "reflect" && <section className="py-7"><h2 className="font-display text-2xl font-bold text-brand-900">Reflection questions</h2>{episode.reflectionQuestions.length ? <ol className="mt-5 space-y-4">{episode.reflectionQuestions.map((question, index) => <li key={question} className="rounded-xl border border-brand-200 bg-white p-5 text-brand-700"><span className="mr-3 font-display text-lg font-extrabold text-accent-700">{index + 1}.</span>{question}</li>)}</ol> : <p className="mt-4 text-brand-500">No reflection questions have been added.</p>}</section>}
          </div>
        </div>

        <aside className="border-l border-brand-200 bg-white xl:max-h-[calc(100vh-112px)] xl:overflow-y-auto">
          <div className="sticky top-0 border-b border-brand-200 bg-white p-5">
            <div className="flex items-center gap-2"><ListVideo className="h-5 w-5 text-accent-700" /><h2 className="font-display text-xl font-bold text-brand-900">Episode library</h2></div>
            <p className="mt-1 text-sm text-brand-500">{episodes.length} episodes in this podcast</p>
          </div>
          <div>
            {episodes.map((item, index) => {
              const active = item.id === episode.id;
              return (
                <Link key={item.id} href={`/demo/${tenantSlug}/episodes/${item.id}`} className={cn("flex gap-3 border-b border-brand-100 p-4 transition", active ? "bg-accent-50" : "hover:bg-brand-50")}>
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold", active ? "bg-accent-600 text-white" : "bg-brand-100 text-brand-600")}>{active ? <CheckCircle2 className="h-4 w-4" /> : episodes.length - index}</span>
                  <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-bold text-brand-900">{item.title}</span><span className="mt-1 block text-xs text-brand-500">{item.videoUrl ? "Video" : "Audio"} episode{item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ""}</span></span>
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

function formatDuration(seconds: number) { const minutes = Math.round(seconds / 60); return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`; }

function downloadTranscript(title: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "episode"}-transcript.txt`; anchor.click(); URL.revokeObjectURL(url);
}
