import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0030_member_directory.sql");
const api = read("app/api/members/route.ts");
const ui = read("components/dashboard/MemberDirectoryManager.tsx");

describe("Milestone 14 member directory", () => {
  it("adds tenant profiles, member tags, notes, and manual assignment metadata", () => {
    expect(migration).toContain("create table if not exists public.tenant_member_profiles");
    expect(migration).toContain("create table if not exists public.member_tags");
    expect(migration).toContain("create table if not exists public.member_notes");
    expect(migration).toContain("assignment_type");
    expect(migration).toContain("'member','guest'");
  });

  it("protects private data and atomically replaces segments", () => {
    expect(migration).toContain("tenant.members.manage");
    expect(migration).toContain("member managers read notes");
    expect(migration).toContain("validate_member_directory_relationships");
    expect(migration).toContain("replace_member_segments");
    expect(migration).toContain("invalid_group_member_relationship");
  });

  it("scopes every audience operation to members or guests in the active tenant", () => {
    expect(api).toContain('getActiveTenantWithPermission("tenant.members.manage")');
    expect(api).toContain('.eq("tenant_id", context.tenant.id)');
    expect(api).toContain('.in("role", ["member","guest"])');
    expect(api).toContain("trialMutationError");
    expect(api).toContain("tenant.memberships.manage");
  });

  it("ships invitations, profiles, lifecycle, plans, tags, groups, and private notes", () => {
    for (const text of ["Invite audience member", "Profile and lifecycle", "Membership plan", "Tags and groups", "Private member notes"]) expect(ui).toContain(text);
    expect(ui).toContain("Search members");
    expect(ui).toContain("Save segments");
  });
});
