import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0029_resource_library.sql");
const managerApi = read("app/api/resources/[resourceId]/details/route.ts");
const bookmarkApi = read("app/api/resources/bookmarks/route.ts");
const managerUi = read("components/dashboard/ResourceExperienceManager.tsx");
const memberLibrary = read("components/tenant/MemberResourceLibrary.tsx");
const memberDetail = read("components/tenant/MemberResourceDetail.tsx");

describe("Milestone 13 resources", () => {
  it("adds governed metadata, versions, bookmarks, and permission", () => {
    for (const field of ["full_description", "file_format", "file_size_bytes", "version_label", "allow_download", "featured", "publish_date"]) expect(migration).toContain(field);
    expect(migration).toContain("create table if not exists public.resource_versions");
    expect(migration).toContain("create table if not exists public.resource_bookmarks");
    expect(migration).toContain("tenant.resources.manage");
  });

  it("protects resource relationships and member-owned bookmarks", () => {
    expect(migration).toContain("validate_resource_support_relationships");
    expect(migration).toContain("user_id=auth.uid()");
    expect(migration).toContain("public.has_content_access(resource_bookmarks.tenant_id,'resource'");
    expect(migration).toContain("resource.status='published'");
  });

  it("scopes manager and member operations to the active tenant", () => {
    expect(managerApi).toContain('getActiveTenantWithPermission("tenant.resources.manage")');
    expect(managerApi).toContain('.eq("tenant_id", context.tenant.id)');
    expect(bookmarkApi).toContain("getTenantMemberContext(input.tenantSlug)");
    expect(bookmarkApi).toContain('.eq("tenant_id", context.tenant.id)');
  });

  it("ships version management, discovery, details, and saved resources", () => {
    for (const text of ["Resource experience", "Version history", "Release notes"]) expect(managerUi).toContain(text);
    for (const text of ["Saved only", "Filter resource type", "View details"]) expect(memberLibrary).toContain(text);
    for (const text of ["Download current version", "Published versions", "Save resource"]) expect(memberDetail).toContain(text);
  });
});
