import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0032_data_governance_rights.sql");
const memberApi = read("app/api/data-rights/route.ts");
const adminApi = read("app/api/data-governance/route.ts");
const memberUi = read("components/tenant/MemberDataRights.tsx");
const adminUi = read("components/dashboard/DataGovernanceManager.tsx");

describe("Milestone 16 data governance and rights", () => {
  it("adds a serialized, validated, permission-gated request workflow", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 32)");
    expect(migration).toContain("create table if not exists public.data_rights_requests");
    expect(migration).toContain("tenant.data.manage");
    expect(migration).toContain("validate_data_rights_request");
    expect(migration).toContain("raw_app_meta_data->>'platform_role'");
    expect(migration).toContain("uq_open_data_rights_request");
  });

  it("removes general member access to operational audit records", () => {
    expect(migration).toContain('drop policy if exists "tenant members read" on public.audit_logs');
    expect(migration).toContain('create policy "tenant data managers read audit logs"');
    expect(migration).not.toContain("data managers delete requests");
  });

  it("builds personal exports only from the member's RLS client", () => {
    expect(memberApi).toContain("getTenantMemberContext");
    expect(memberApi).toContain('context.supabase.from("tenant_member_profiles")');
    expect(memberApi).toContain('.eq("user_id", context.user.id)');
    expect(memberApi).toContain("Daily personal-export limit reached");
    expect(memberApi).toContain("member.data.exported");
  });

  it("requires governance permission and audits capped audit exports and resolutions", () => {
    expect(adminApi).toContain('getActiveTenantWithPermission("tenant.data.manage")');
    expect(adminApi).toContain(".limit(5000)");
    expect(adminApi).toContain("tenant.audit.exported");
    expect(adminApi).toContain("tenant.data_request.${parsed.data.status}");
    expect(adminApi).toContain("Completed or denied requests require resolution notes");
    for (const value of ["Download my data", "does not immediately delete", "Submit for review"]) expect(memberUi).toContain(value);
    for (const value of ["Export audit CSV", "Resolution notes", "recorded in the audit history"]) expect(adminUi).toContain(value);
  });
});
