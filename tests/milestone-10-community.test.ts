import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0026_community_discussions.sql");
const memberApi = read("app/api/community/route.ts");
const moderationApi = read("app/api/community/moderation/route.ts");
const memberUi = read("components/tenant/CommunitySpaceDiscussions.tsx");
const moderationUi = read("components/dashboard/CommunityModerationManager.tsx");

describe("Milestone 10 community", () => {
  it("adds governance, reporting, and reaction integrity", () => {
    expect(migration).toContain("tenant.community.manage");
    expect(migration).toContain("create table if not exists public.community_reports");
    expect(migration).toContain("community_reactions_target_check");
    expect(migration).toContain("validate_community_relationships");
  });

  it("enforces access-aware visible reads and safe member writes", () => {
    expect(migration).toContain("public.has_content_access(community_posts.tenant_id,'community_space'");
    expect(migration).toContain("status='published' and not is_pinned and not is_locked");
    expect(migration).toContain("reporter_id=auth.uid()");
    expect(migration).not.toContain('create policy "members update own posts"');
  });

  it("scopes member and moderator operations to the active tenant", () => {
    expect(memberApi).toContain("getTenantMemberContext(input.tenantSlug)");
    expect(memberApi).toContain('.eq("tenant_id", context.tenant.id)');
    expect(moderationApi).toContain('getActiveTenantWithPermission("tenant.community.manage")');
    expect(moderationApi).toContain('.eq("tenant_id", context.tenant.id)');
  });

  it("ships discussions, replies, reactions, reports, and moderation controls", () => {
    for (const text of ["Start a discussion", "Write a reply", "Report discussion", "Search discussions"]) expect(memberUi).toContain(text);
    for (const text of ["Reports", "Recent discussions", "Recent replies", "Space settings"]) expect(moderationUi).toContain(text);
  });
});
