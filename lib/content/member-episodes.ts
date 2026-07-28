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
  transcript: string;
  resources: Array<{ title: string; url: string }>;
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
    .select("id,title,description,video_url,audio_url,publish_date,access_level,created_at")
    .eq("tenant_id", tenant.id)
    .eq("status", "published")
    .order("publish_date", { ascending: false, nullsFirst: false });
  if (error) return [];

  return (episodes ?? []).map((episode) => ({
    id: episode.id,
    title: episode.title,
    description: episode.description ?? "",
    videoUrl: episode.video_url ?? "",
    audioUrl: episode.audio_url ?? "",
    publishDate: episode.publish_date ?? episode.created_at,
    accessLevel: episode.access_level,
    transcript: "",
    resources: []
  }));
}

export async function getPublishedEpisode(tenantSlug: string, episodeId: string) {
  const episodes = await getPublishedEpisodes(tenantSlug);
  const episode = episodes.find((item) => item.id === episodeId);
  if (!episode) return { episode: null, episodes };

  const supabase = await createClient();
  const [{ data: transcript }, { data: resources }] = await Promise.all([
    supabase.from("episode_transcripts").select("content").eq("episode_id", episodeId).eq("status", "published").maybeSingle(),
    supabase.from("episode_resources").select("title,url").eq("episode_id", episodeId).order("created_at")
  ]);

  return {
    episode: {
      ...episode,
      transcript: transcript?.content ?? "",
      resources: resources ?? []
    },
    episodes
  };
}
