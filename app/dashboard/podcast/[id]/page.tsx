import { ArrowLeft, FileText, Headphones, Video } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button, Card, CardTitle } from "@/components/ui";
import { VideoPlayer } from "@/components/content/VideoPlayer";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

export default async function EpisodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getActiveTenantManager();
  if (!context) notFound();
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get("podcasts") !== true) notFound();
  const { data: episode } = await context.supabase
    .from("episodes")
    .select("id,title,description,status,audio_url,video_url,publish_date")
    .eq("tenant_id", context.tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (!episode) notFound();
  return (
    <div className="space-y-6">
      <Button href="/dashboard/podcast" variant="ghost"><ArrowLeft className="h-4 w-4" />Back to Podcast</Button>
      <div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">{episode.status}</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">{episode.title}</h1><p className="mt-3 max-w-3xl text-brand-600">{episode.description || "No description has been added."}</p></div>
      <div className="grid gap-5 xl:grid-cols-2">
        {episode.audio_url ? <Card><CardTitle>Audio</CardTitle><audio controls className="mt-5 w-full" src={episode.audio_url}>Your browser does not support audio playback.</audio></Card> : <EmptyState title="No audio uploaded." description="Add an audio file from the podcast editor." icon={Headphones} />}
        {episode.video_url ? <Card><CardTitle>Video</CardTitle><div className="mt-5 overflow-hidden rounded-xl bg-black"><VideoPlayer url={episode.video_url} title={episode.title} /></div></Card> : <EmptyState title="No video added." description="Add a video URL from the podcast editor." icon={Video} />}
      </div>
      {entitlements.get("creator_ai_studio") === true && <EmptyState title="No generated episode assets." description="Create a source-based summary or supporting asset in AI Studio." actionLabel="Open AI Studio" actionHref="/dashboard/ai-studio" icon={FileText} />}
    </div>
  );
}
