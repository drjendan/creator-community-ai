import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0035_operational_readiness.sql");
const api = read("app/api/platform/operations/route.ts");
const consoleUi = read("components/platform/PlatformOperationalReadiness.tsx");

describe("Milestone 19 operational readiness", () => {
  it("creates serialized, production-only operational evidence controls", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 35)");
    expect(migration).toContain("public.platform_operational_settings");
    expect(migration).toContain("public.production_readiness_checks");
    expect(migration).toContain("public.recovery_verifications");
    expect(migration).toContain("check(environment='production')");
  });

  it("seeds gates as pending and requires evidence for passed states", () => {
    expect(migration).toContain("status text not null default 'pending'");
    expect(migration).toContain("readiness_evidence_required");
    expect(migration).toContain("recovery_evidence_required");
    expect(migration).not.toContain("insert into public.production_readiness_checks(check_key,label,category,status)");
  });

  it("allows append-only recovery records for operations managers", () => {
    expect(migration).toContain("platform.operations.manage");
    expect(migration).toContain('for insert with check(public.has_platform_permission(\'platform.operations.manage\'))');
    expect(migration).not.toMatch(/policy[^;]+recovery_verifications[^;]+for delete/i);
  });

  it("reports live diagnostics separately and audits evidence changes", () => {
    expect(api).toContain('admin.storage.listBuckets()');
    expect(api).toContain('admin.from("tenants").select');
    expect(api).toContain('admin.from("audit_logs").insert');
    expect(api).toContain('environment: "production"');
  });

  it("never presents missing evidence as release approval", () => {
    expect(consoleUi).toContain("Pending stays pending");
    expect(consoleUi).toContain("Not ready for production release");
    expect(consoleUi).toContain("operator approval still required");
    expect(consoleUi).toContain("No recovery verification has been recorded");
  });
});
