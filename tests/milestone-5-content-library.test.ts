import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dashboardNavItems } from "@/lib/navigation";
import { terminology } from "@/lib/terminology";

describe("Milestone 5 Content Library consolidation contracts", () => {
  const migration = readFileSync("supabase/migrations/0021_content_library_consolidation.sql", "utf8");
  const route = readFileSync("app/api/content-library/route.ts", "utf8");
  const memberData = readFileSync("lib/content/unified-library.ts", "utf8");

  it("routes the approved Content Library label to the unified workspace", () => {
    expect(dashboardNavItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: terminology.contentLibrary, href: "/dashboard/content-library", permission: "tenant.content.view" }),
      expect.objectContaining({ label: "Resources", href: "/dashboard/resources" })
    ]));
  });

  it("installs tenant-scoped polymorphic categories with validation and cleanup", () => {
    expect(migration).toContain("create table if not exists public.content_category_assignments");
    expect(migration).toContain("validate_content_category_assignment");
    expect(migration).toContain("invalid_tenant_content");
    expect(migration).toContain("remove_content_category_assignments");
    expect(migration).toContain("public.is_tenant_member(tenant_id)");
    expect(migration).not.toMatch(/create policy[^;]+for (insert|update|delete)/i);
  });

  it("replaces assignments atomically and requires database-backed content permission", () => {
    expect(migration).toContain("replace_content_category_assignments");
    expect(migration).toContain("public.has_tenant_permission(target_tenant,'tenant.content.manage')");
    expect(migration).toContain("public.has_platform_permission('platform.tenants.manage')");
    expect(route).toContain('getActiveTenantWithPermission("tenant.content.manage")');
    expect(route).toContain('target_tenant: context.tenant.id');
    expect(route).toContain('action: "tenant.content.categories_changed"');
  });

  it("keeps member content reads behind existing RLS while exposing only safe category metadata", () => {
    expect(memberData).toContain('const supabase = await createClient()');
    for (const table of ["episodes", "courses", "resources", "events"]) {
      expect(memberData).toContain(`supabase.from("${table}")`);
    }
    expect(memberData).not.toContain('admin.from("episodes")');
    expect(memberData).not.toContain('admin.from("courses")');
    expect(memberData).not.toContain('admin.from("resources")');
    expect(memberData).not.toContain('admin.from("events")');
  });
});
