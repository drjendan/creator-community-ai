import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const provisioning = read("app/platform-admin/tenants/actions.ts");
const lifecycle = read("supabase/migrations/0039_custom_domain_lifecycle.sql");
const fix = read("supabase/migrations/0042_managed_domain_provisioning_fix.sql");
const guard = read("supabase/migrations/0043_managed_domain_trigger_guard.sql");

describe("managed tenant-domain provisioning", () => {
  it("creates the platform-managed primary domain in its active wildcard state", () => {
    expect(provisioning).toContain('status: "active", domain_type: "upnexx_subdomain", ssl_status: "active"');
    expect(provisioning).toContain("dns_verified_at: managedDomainActivatedAt");
    expect(provisioning).toContain("ssl_verified_at: managedDomainActivatedAt");
    expect(provisioning).not.toContain('status: "pending", domain_type: "upnexx_subdomain"');
  });

  it("preserves the primary-domain lifecycle invariant", () => {
    expect(lifecycle).toContain("if new.is_primary and new.status<>'active' then raise exception 'primary_domain_must_be_active'");
  });

  it("normalizes only managed domains for active or pending tenants", () => {
    expect(fix).toContain("pg_advisory_xact_lock(55404, 42)");
    expect(fix).toContain("domain.domain_type = 'upnexx_subdomain'");
    expect(fix).toContain("tenant.status in ('active', 'pending')");
    expect(fix).toContain("status = 'active'");
    expect(fix).toContain("ssl_status = 'active'");
    expect(fix).not.toContain("domain.domain_type = 'custom'");
  });

  it("normalizes stale managed-domain inserts before enforcing the invariant", () => {
    expect(guard).toContain("pg_advisory_xact_lock(55404, 43)");
    expect(guard).toContain("new.domain_type='upnexx_subdomain' and new.is_primary");
    expect(guard).toContain("new.status:='active'");
    expect(guard).toContain("new.ssl_status:='active'");
    expect(guard.indexOf("new.status:='active'")).toBeLessThan(guard.indexOf("primary_domain_must_be_active"));
    expect(guard).toContain("domain_ownership_verification_required");
    expect(guard).toContain("active_ssl_verification_required");
  });
});
