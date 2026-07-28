"use client";

import { FormEvent, useState } from "react";
import { Copy, Download, RefreshCw, Sparkles } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

export function CreatorAiStudio() {
  const [sourceText, setSourceText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const form = event?.currentTarget ?? document.querySelector<HTMLFormElement>("#creator-ai-form");
    if (!form) return;
    const data = new FormData(form);
    setLoading(true); setMessage("");
    const response = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      sourceType: data.get("sourceType"), sourceId: data.get("sourceId"), sourceText,
      outputType: data.get("outputType"), audience: data.get("audience"), tone: data.get("tone"),
      length: data.get("length"), callToAction: data.get("callToAction"), variations: Number(data.get("variations"))
    }) });
    const result = await response.json();
    if (response.ok) { setResults(result.variations); setRemaining(result.remaining); setMessage(`Generated and saved. ${result.credits} credits used.`); }
    else setMessage(result.error ?? "Generation failed.");
    setLoading(false);
  }

  function exportResults() {
    const blob = new Blob([results.map((result, index) => `Variation ${index + 1}\n\n${result}`).join("\n\n---\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "podcastos-ai-content.txt"; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-6">
    <div><div className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-strong"><Sparkles className="h-4 w-4" />Tenant-aware AI</div><h1 className="mt-3 font-display text-3xl font-extrabold text-brand-900">Creator AI Studio</h1><p className="mt-2 max-w-3xl text-sm text-brand-600">Transform approved tenant content into summaries, posts, newsletters, learning activities, and promotional copy. Generated drafts are saved and usage is charged to this tenant.</p></div>
    <form id="creator-ai-form" onSubmit={generate} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="space-y-5"><h2 className="font-display text-xl font-bold text-brand-900">Source content</h2><div className="grid gap-5 md:grid-cols-2"><Field label="Source type" htmlFor="ai-source-type"><Select id="ai-source-type" name="sourceType" defaultValue="manual"><option value="manual">Manually entered text</option><option value="podcast_transcript">Podcast transcript</option><option value="course">Course</option><option value="lesson">Lesson</option><option value="document">Document</option><option value="event">Event</option><option value="community_discussion">Community discussion</option></Select></Field><Field label="Associated source ID" htmlFor="ai-source-id" hint="Optional UUID from UpNexx."><Input id="ai-source-id" name="sourceId" /></Field></div><Field label="Source text" htmlFor="ai-source-text" hint="The model is instructed not to invent facts outside this source." required><Textarea id="ai-source-text" value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="min-h-72" required /></Field></Card>
      <Card className="space-y-5"><h2 className="font-display text-xl font-bold text-brand-900">Output controls</h2><Field label="Output type" htmlFor="ai-output"><Select id="ai-output" name="outputType"><option value="episode_summary">Episode summary</option><option value="show_notes">Show notes</option><option value="blog_post">Blog post</option><option value="linkedin_post">LinkedIn post</option><option value="facebook_post">Facebook post</option><option value="instagram_caption">Instagram caption</option><option value="x_post">X post</option><option value="email_newsletter">Email newsletter</option><option value="episode_topic_ideas">Episode topic ideas</option><option value="quiz_questions">Quiz questions</option><option value="discussion_questions">Discussion questions</option><option value="event_description">Event description</option><option value="promotional_copy">Promotional copy</option></Select></Field><Field label="Audience" htmlFor="ai-audience"><Input id="ai-audience" name="audience" defaultValue="Podcast members" required /></Field><Field label="Tone" htmlFor="ai-tone"><Input id="ai-tone" name="tone" defaultValue="Clear, warm, and professional" required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Length" htmlFor="ai-length"><Select id="ai-length" name="length"><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></Select></Field><Field label="Variations" htmlFor="ai-variations"><Select id="ai-variations" name="variations"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option></Select></Field></div><Field label="Call to action" htmlFor="ai-cta"><Input id="ai-cta" name="callToAction" placeholder="Join the next live session" /></Field><Button type="submit" disabled={loading || sourceText.trim().length < 20}>{loading ? <><RefreshCw className="h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4" />Generate and save</>}</Button>{remaining !== null && <p className="text-xs font-bold text-brand-500">{remaining.toLocaleString()} tenant credits remaining</p>}</Card>
    </form>
    {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
    {results.length > 0 && <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold text-brand-900">Generated drafts</h2><div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => void generate()}><RefreshCw className="h-4 w-4" />Regenerate</Button><Button type="button" variant="secondary" onClick={exportResults}><Download className="h-4 w-4" />Export</Button></div></div>{results.map((result, index) => <Card key={index}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Variation {index + 1}</p><button type="button" onClick={() => void navigator.clipboard.writeText(results[index])} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-accent-700 hover:bg-accent-50"><Copy className="h-4 w-4" />Copy</button></div><Textarea aria-label={`Edit variation ${index + 1}`} className="mt-4 min-h-56" value={result} onChange={(event) => setResults((current) => current.map((value, resultIndex) => resultIndex === index ? event.target.value : value))} /></Card>)}</section>}
  </div>;
}

