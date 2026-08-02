import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MemberEpisode = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  audioUrl: string;
  publishDate: string;
  accessLevel: string;
  coverImageUrl: string;
  showNotes: string;
  keyTakeaways: string[];
  reflectionQuestions: string[];
  durationSeconds: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  featured: boolean;
  topics: string[];
  transcript: string;
  transcriptLanguage: string;
  transcriptDownloadable: boolean;
  resources: Array<{ title: string; description: string; url: string; resourceType: string; allowDownload: boolean }>;
};

export async function getPublishedEpisodes(tenantSlug: string): Promise<MemberEpisode[]> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .eq("status", "active")
    .maybeSingle();
  if (!tenant) return [];

  const supabase = await createClient();
  const { data: episodes, error } = await supabase
    .from("episodes")
    .select("id,title,description,video_url,audio_url,cover_image_url,publish_date,access_level,created_at,show_notes,key_takeaways,reflection_questions,duration_seconds,season_number,episode_number,featured")
    .eq("tenant_id", tenant.id)
    .eq("status", "published")
    .or("audio_url.not.is.null,video_url.not.is.null")
    .order("publish_date", { ascending: false, nullsFirst: false });
  if (error) return [];

  const episodeIds = (episodes ?? []).map((episode) => episode.id);
  const { data: tagRows } = episodeIds.length
    ? await supabase.from("episode_tags").select("episode_id,tag").in("episode_id", episodeIds).order("tag")
    : { data: [] as Array<{ episode_id: string; tag: string }> };
  const tagsByEpisode = new Map<string, string[]>();
  for (const row of tagRows ?? []) tagsByEpisode.set(row.episode_id, [...(tagsByEpisode.get(row.episode_id) ?? []), row.tag]);

  return (episodes ?? []).map((episode) => ({
    id: episode.id,
    title: episode.title,
    description: episode.description ?? "",
    videoUrl: episode.video_url ?? "",
    audioUrl: episode.audio_url ?? "",
    publishDate: episode.publish_date ?? episode.created_at,
    accessLevel: episode.access_level,
    coverImageUrl: episode.cover_image_url ?? "",
    showNotes: episode.show_notes ?? "",
    keyTakeaways: Array.isArray(episode.key_takeaways) ? episode.key_takeaways.filter((item): item is string => typeof item === "string") : [],
    reflectionQuestions: Array.isArray(episode.reflection_questions) ? episode.reflection_questions.filter((item): item is string => typeof item === "string") : [],
    durationSeconds: episode.duration_seconds ?? null,
    seasonNumber: episode.season_number ?? null,
    episodeNumber: episode.episode_number ?? null,
    featured: episode.featured ?? false,
    topics: tagsByEpisode.get(episode.id) ?? [],
    transcript: "",
    transcriptLanguage: "en",
    transcriptDownloadable: false,
    resources: []
  }));
}

export async function getPublishedEpisode(tenantSlug: string, episodeId: string) {
  const episodes = await getPublishedEpisodes(tenantSlug);
  const episode = episodes.find((item) => item.id === episodeId);
  if (!episode) return { episode: null, episodes };

  const supabase = await createClient();
  const [{ data: transcript }, { data: resources }] = await Promise.all([
    supabase.from("episode_transcripts").select("content,language,allow_download").eq("episode_id", episodeId).eq("status", "published").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("episode_resources").select("title,description,url,resource_type,allow_download").eq("episode_id", episodeId).order("sort_order")
  ]);

  return {
    episode: {
      ...episode,
      transcript: transcript?.content ?? "",
      transcriptLanguage: transcript?.language ?? "en",
      transcriptDownloadable: transcript?.allow_download ?? false,
      resources: (resources ?? []).map((resource) => ({ title: resource.title, description: resource.description ?? "", url: resource.url, resourceType: resource.resource_type ?? "link", allowDownload: resource.allow_download ?? false }))
    },
    episodes
  };
}
