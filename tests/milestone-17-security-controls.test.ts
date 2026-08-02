import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0033_abuse_controls_security_events.sql");
const limiter = read("lib/rate-limit.ts");
const securityApi = read("app/api/platform/security/route.ts");
const securityUi = read("components/platform/PlatformSecurityEvents.tsx");

describe("Milestone 17 abuse controls and security events", () => {
  it("adds atomic durable limits and reviewable security events", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 33)");
    expect(migration).toContain("create table if not exists public.api_rate_limit_windows");
    expect(migration).toContain("create table if not exists public.security_events");
    expect(migration).toContain("consume_api_rate_limit");
    expect(migration).toContain("on conflict(scope,key_hash,window_started_at) do update");
    expect(migration).toContain("grant execute on function public.consume_api_rate_limit");
    expect(migration).not.toContain("('platform_support','platform.security.manage')");
  });

  it("uses privacy-safe HMAC identifiers and fails closed when storage is unavailable", () => {
    expect(limiter).toContain('createHmac("sha256", secret())');
    expect(limiter).toContain("RATE_LIMIT_SECRET is required in production");
    expect(limiter).toContain("unavailable: true");
    expect(limiter).not.toContain("ip_address");
  });

  it("protects authentication, AI, support, and data-rights entry points", () => {
    const files = ["app/login/actions.ts", "app/signup/actions.ts", "app/api/ai/generate/route.ts", "app/api/ai/coach/route.ts", "app/api/support/route.ts", "app/api/platform/support/route.ts", "app/api/data-rights/route.ts"];
    for (const file of files) expect(read(file)).toContain("enforceRateLimit");
  });

  it("permission-gates and audits human security-event review", () => {
    expect(securityApi).toContain('getPlatformAdministrator("platform.security.manage")');
    expect(securityApi).toContain("Resolved or ignored events require resolution notes");
    expect(securityApi).toContain("platform.security_event.${parsed.data.status}");
    expect(securityUi).toContain("external monitoring and incident response");
    expect(securityUi).toContain("Security resolution notes");
  });
});
