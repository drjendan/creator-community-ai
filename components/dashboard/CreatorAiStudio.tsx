"use client";

import { FormEvent, useEffect, useState } from "react";
import { Copy, Download, RefreshCw, Save, Sparkles } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type SourceType = "manual" | "podcast_transcript" | "course" | "lesson" | "document" | "event" | "community_discussion";
type SourceOption = { id: string; title: string; preview: string };
type SourceGroups = Partial<Record<Exclude<SourceType, "manual">, SourceOption[]>>;

const sourceTypeLabels: Record<SourceType, string> = {
  manual: "No source / start from scratch",
  podcast_transcript: "Podcast episode",
  course: "Course",
  lesson: "Lesson",
  document: "Document or resource",
  event: "Event",
  community_discussion: "Community discussion"
};

export function CreatorAiStudio() {
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [sourceId, setSourceId] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sources, setSources] = useState<SourceGroups>({});
  const [results, setResults] = useState<string[]>([]);
  const [generationId, setGenerationId] = useState("");
  const [version, setVersion] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    void fetch("/api/ai/sources", { cache: "no-store" }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (response.ok) setSources(result.sources ?? {});
      else setMessage(result.error ?? "Unable to load tenant sources.");
    }).catch(() => setMessage("Unable to load tenant sources."));
  }, []);

  const options = sourceType === "manual" ? [] : sources[sourceType] ?? [];
  const selectedSource = options.find((option) => option.id === sourceId);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const form = event?.currentTarget ?? document.querySelector<HTMLFormElement>("#creator-ai-form");
    if (!form) return;
    const data = new FormData(form);
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      sourceType, sourceId: sourceType === "manual" ? "" : sourceId, sourceText: sourceType === "manual" ? sourceText : "",
      outputType: data.get("outputType"), audience: data.get("audience"), tone: data.get("tone"), channel: data.get("channel"),
      length: data.get("length"), callToAction: data.get("callToAction"), additionalInstructions: data.get("additionalInstructions"), variations: Number(data.get("variations"))
    }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setResults(result.variations);
      setGenerationId(result.id);
      setVersion(result.version);
      setRemaining(result.remaining);
      setMessage(`Generated from ${result.sourceTitle}. Review the draft, then save your edits to Content Library. ${result.credits} credits used.`);
    } else setMessage(result.error ?? "Generation failed.");
    setLoading(false);
  }

  async function saveDraft() {
    if (!generationId) return;
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/ai/generations/${generationId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ output: results, status: "saved" }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setVersion(result.version);
      setMessage(`Version ${result.version} saved to Content Library.`);
    } else setMessage(result.error ?? "Unable to save the AI draft.");
    setSaving(false);
  }

  function exportResults() {
    const blob = new Blob([results.map((result, index) => `Variation ${index + 1}\n\n${result}`).join("\n\n---\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "upnexx-ai-content.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  const sourceReady = sourceType === "manual" ? sourceText.trim().length >= 20 : Boolean(sourceId);
  return <div className="space-y-6">
    <div><div className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-strong"><Sparkles className="h-4 w-4" />Tenant-aware AI</div><h1 className="mt-3 font-display text-3xl font-extrabold text-brand-900">Creator AI Studio</h1><p className="mt-2 max-w-3xl text-sm text-brand-600">Choose a readable tenant source, generate grounded drafts, review the output, and save versioned content without handling database IDs.</p></div>
    <form id="creator-ai-form" onSubmit={generate} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="space-y-5">
        <h2 className="font-display text-xl font-bold text-brand-900">1. Select source</h2>
        <Field label="Source type" htmlFor="ai-source-type"><Select id="ai-source-type" value={sourceType} onChange={(event) => { setSourceType(event.target.value as SourceType); setSourceId(""); }}>{Object.entries(sourceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
        {sourceType === "manual" ? <Field label="Source text" htmlFor="ai-source-text" hint="The model is instructed to use only supported facts from this text." required><Textarea id="ai-source-text" value={sourceText} onChange={(event) => setSourceText(event.target.value)} className="min-h-72" required /></Field> : <>
          <Field label={`Choose ${sourceTypeLabels[sourceType]}`} htmlFor="ai-source"><Select id="ai-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)} required><option value="">Select a tenant source</option>{options.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</Select></Field>
          {selectedSource && <div className="rounded-xl bg-brand-50 p-4"><p className="font-bold text-brand-900">{selectedSource.title}</p><p className="mt-2 text-sm text-brand-600">{selectedSource.preview || "The source will be resolved securely when you generate."}</p></div>}
          {options.length === 0 && <p className="text-sm text-brand-600">No sources of this type are available in this tenant.</p>}
        </>}
      </Card>
      <Card className="space-y-5">
        <h2 className="font-display text-xl font-bold text-brand-900">2. Configure output</h2>
        <Field label="Output type" htmlFor="ai-output"><Select id="ai-output" name="outputType"><option value="episode_summary">Episode summary</option><option value="show_notes">Show notes</option><option value="blog_post">Blog article</option><option value="linkedin_post">LinkedIn post</option><option value="facebook_post">Facebook post</option><option value="instagram_caption">Instagram caption</option><option value="x_post">X post</option><option value="email_newsletter">Email newsletter</option><option value="episode_topic_ideas">Episode topic ideas</option><option value="quiz_questions">Quiz questions</option><option value="discussion_questions">Discussion questions</option><option value="event_description">Event announcement</option><option value="promotional_copy">Promotional copy</option></Select></Field>
        <Field label="Audience" htmlFor="ai-audience"><Input id="ai-audience" name="audience" defaultValue="Current members" required /></Field>
        <Field label="Tone" htmlFor="ai-tone"><Input id="ai-tone" name="tone" defaultValue="Clear, warm, and professional" required /></Field>
        <Field label="Channel" htmlFor="ai-channel"><Select id="ai-channel" name="channel"><option value="general">General content</option><option value="linkedin">LinkedIn</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="x">X</option><option value="email">Email</option><option value="blog">Blog</option><option value="website">Website</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="in_app">In-app announcement</option></Select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Length" htmlFor="ai-length"><Select id="ai-length" name="length"><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></Select></Field><Field label="Variations" htmlFor="ai-variations"><Select id="ai-variations" name="variations"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="5">5</option></Select></Field></div>
        <Field label="Call to action" htmlFor="ai-cta"><Input id="ai-cta" name="callToAction" placeholder="Join the next live session" /></Field>
        <Field label="Additional instructions" htmlFor="ai-instructions"><Textarea id="ai-instructions" name="additionalInstructions" className="min-h-24" /></Field>
        <Button type="submit" disabled={loading || !sourceReady}>{loading ? <><RefreshCw className="h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4" />Generate draft</>}</Button>
        {remaining !== null && <p className="text-xs font-bold text-brand-500">{remaining.toLocaleString()} tenant credits remaining</p>}
      </Card>
    </form>
    {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
    {results.length > 0 && <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-2xl font-bold text-brand-900">3. Review and save</h2>{version && <p className="mt-1 text-xs font-semibold text-brand-500">Current version {version}</p>}</div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => void generate()}><RefreshCw className="h-4 w-4" />Regenerate</Button><Button type="button" variant="secondary" onClick={exportResults}><Download className="h-4 w-4" />Export</Button><Button type="button" onClick={() => void saveDraft()} disabled={saving}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save to Content Library"}</Button></div></div>{results.map((result, index) => <Card key={index}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Variation {index + 1}</p><button type="button" onClick={() => void navigator.clipboard.writeText(results[index])} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-accent-700 hover:bg-accent-50"><Copy className="h-4 w-4" />Copy</button></div><Textarea aria-label={`Edit variation ${index + 1}`} className="mt-4 min-h-56" value={result} onChange={(event) => setResults((current) => current.map((value, resultIndex) => resultIndex === index ? event.target.value : value))} /></Card>)}</section>}
  </div>;
}
