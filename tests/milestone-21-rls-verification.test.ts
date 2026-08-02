import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0037_production_rls_verification.sql");
const api = read("app/api/platform/isolation/route.ts");
const consoleUi = read("components/platform/PlatformIsolationVerification.tsx");

describe("Milestone 21 production RLS verification", () => {
  it("creates production-only, append-only verification evidence", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 37)");
    expect(migration).toContain("public.rls_verification_runs");
    expect(migration).toContain("public.rls_verification_results");
    expect(migration).toContain("check(environment='production')");
    expect(migration).toContain("on delete restrict");
    expect(migration).not.toMatch(/policy[^;]+rls_verification_(runs|results)[^;]+for delete/i);
  });

  it("separates automatic metadata checks from behavioral evidence", () => {
    expect(migration).toContain("automatic_metadata");
    expect(migration).toContain("manual_behavioral");
    expect(migration).toContain("tenant_tables_rls_enabled");
    expect(migration).toContain("cross_tenant_read_denied");
    expect(migration).toContain("storage_path_isolation");
    expect(migration).toContain("user_owned_ai_boundary");
  });

  it("prevents browser mutation of automatic evidence", () => {
    expect(migration).toContain("revoke insert,update,delete on public.rls_verification_results from anon,authenticated");
    expect(api).toContain("Automatic metadata results cannot be manually overridden.");
    expect(api).toContain('getPlatformAdministrator("platform.security.manage")');
  });

  it("cannot pass with pending, failed, or blocked results", () => {
    expect(migration).toContain("pending_verification_results");
    expect(migration).toContain("status in ('failed','blocked')");
    expect(migration).toContain("then 'failed' else 'passed'");
    expect(migration).toContain("where check_key='production_rls_matrix'");
    expect(consoleUi).toContain("Finalization is blocked while any case is pending");
    expect(consoleUi).toContain("do not replace behavioral testing");
  });

  it("records audited production run and result changes", () => {
    expect(api).toContain("platform.rls_verification.started");
    expect(api).toContain("platform.rls_verification.${input.status}");
    expect(api).toContain("platform.rls_verification.${data}");
    expect(consoleUi).toContain("Production only");
  });
});
