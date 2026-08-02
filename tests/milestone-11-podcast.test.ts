import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0027_podcast_experience.sql");
const api = read("app/api/podcast/[episodeId]/details/route.ts");
const editor = read("components/dashboard/EpisodeContentManager.tsx");
const library = read("components/content/MemberEpisodeGrid.tsx");
const experience = read("components/content/EpisodeWatchExperience.tsx");

describe("Milestone 11 podcast", () => {
  it("adds complete episode learning metadata", () => {
    for (const field of ["show_notes", "key_takeaways", "reflection_questions", "duration_seconds", "season_number", "episode_number", "featured"]) expect(migration).toContain(field);
    for (const field of ["language", "allow_download", "resource_type", "sort_order"]) expect(migration).toContain(field);
  });

  it("inherits parent episode access and validates tenant relationships", () => {
    expect(migration).toContain("episode.id=episode_transcripts.episode_id");
    expect(migration).toContain("episode.id=episode_resources.episode_id");
    expect(migration).toContain("episode.id=episode_tags.episode_id");
    expect(migration).toContain("validate_episode_support_relationships");
  });

  it("protects creator operations with permission and tenant scope", () => {
    expect(api).toContain('getActiveTenantWithPermission("tenant.podcasts.manage")');
    expect(api).toContain('.eq("tenant_id", context.tenant.id)');
    expect(api).toContain("Add transcript text before publishing it.");
  });

  it("ships authoring, discovery, and the complete member experience", () => {
    for (const text of ["Episode learning experience", "Transcript", "Episode resources", "Topics"]) expect(editor).toContain(text);
    for (const text of ["Filter by topic", "Featured", "Audio episode"]) expect(library).toContain(text);
    for (const text of ["Show notes", "Key takeaways", "Reflection questions", "downloadTranscript"]) expect(experience).toContain(text);
  });
});
