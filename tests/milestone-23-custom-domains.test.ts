import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeCustomHostname, validateCustomHostname } from "@/lib/tenant-domains";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0039_custom_domain_lifecycle.sql");
const middleware = read("middleware.ts");
const tenantApi = read("app/api/domains/route.ts");
const platformApi = read("app/api/platform/domains/route.ts");
const tenantLifecycle = read("app/api/platform/tenants/[id]/lifecycle/route.ts");

describe("Milestone 23 custom-domain lifecycle", () => {
  it("normalizes and rejects unsafe or platform-owned hostnames", () => {
    expect(normalizeCustomHostname(" Community.Example.COM. ")).toBe("community.example.com");
    expect(validateCustomHostname("community.example.com")).toBeNull();
    expect(validateCustomHostname("https://example.com/path")).toMatch(/hostname only/i);
    expect(validateCustomHostname("localhost")).toMatch(/cannot be custom domains/i);
    expect(validateCustomHostname("tenant.upnexx.net")).toMatch(/UpNexx-managed/i);
  });

  it("requires fresh ownership, route, and certificate evidence", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 39)");
    expect(migration).toContain("tenant_domain_verification_attempts");
    expect(migration).toContain("domain_ownership_verification_required");
    expect(migration).toContain("active_ssl_verification_required");
    expect(migration).toContain("dns_verified_at is not null");
    expect(migration).toContain("ssl_verified_at is not null");
  });

  it("keeps verification evidence append-only and permission gated", () => {
    expect(migration).toContain("tenant.domains.manage");
    expect(migration).toContain("revoke insert,update,delete on public.tenant_domain_verification_attempts from anon,authenticated");
    expect(migration).not.toContain('for delete using(public.has_tenant_permission(tenant_id,\'tenant.domains.manage\'))');
    expect(platformApi).toContain('getPlatformAdministrator("platform.operations.manage")');
  });

  it("performs live DNS ownership and routing checks without trusting configuration", () => {
    expect(platformApi).toContain("resolveTxt(domain.verification_record_name)");
    expect(platformApi).toContain("resolveCname(domain.hostname)");
    expect(platformApi).toContain("ownershipPassed && routePassed");
    expect(tenantApi).not.toContain('status: "dns_verified"');
  });

  it("resolves only active verified custom hosts and redirects managed hosts canonically", () => {
    expect(migration).toContain("resolve_active_tenant_domain");
    expect(migration).toContain("resolve_tenant_canonical_domain");
    expect(migration).toContain("d.canonical_redirect_enabled");
    expect(middleware).toContain('resolver.rpc("resolve_active_tenant_domain"');
    expect(middleware).toContain('resolver.rpc("resolve_tenant_canonical_domain"');
    expect(middleware).toContain("NextResponse.redirect(canonicalDestination, 308)");
  });

  it("requires evidence-backed activation and rollback before passing readiness", () => {
    expect(migration).toContain("activate_tenant_custom_domain");
    expect(migration).toContain("rollback_tenant_custom_domain");
    expect(migration).toContain("activation_evidence_required");
    expect(migration).toContain("rollback_evidence_required");
    expect(migration).toContain("reactivate the verified domain to complete the gate");
    expect(tenantApi).toContain("Active domains require an evidence-backed platform rollback.");
    expect(tenantLifecycle).toContain('.eq("domain_type", "upnexx_subdomain")');
    expect(tenantLifecycle).toContain("this is not a passed rollback rehearsal");
  });
});
