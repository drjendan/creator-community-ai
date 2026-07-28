import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAllowedModel, providerIds } from "@/lib/ai/provider-catalog";
import {
  canManagePlatformAI,
  canManageTenantAI,
  tenantRequestMatchesCurrentWorkspace
} from "@/lib/ai/permissions";

describe("AI configuration authorization", () => {
  it("allows only tenant owners and tenant administrators in tenant context", () => {
    expect(canManageTenantAI("tenant_owner")).toBe(true);
    expect(canManageTenantAI("tenant_admin")).toBe(true);
    expect(canManageTenantAI("content_manager")).toBe(false);
    expect(canManageTenantAI("platform_admin")).toBe(false);
  });

  it("evaluates platform roles separately from tenant roles", () => {
    expect(canManagePlatformAI("platform_owner")).toBe(true);
    expect(canManagePlatformAI("platform_admin")).toBe(true);
    expect(canManagePlatformAI("tenant_admin")).toBe(false);
  });

  it("rejects a manipulated tenant ID in tenant workspace context", () => {
    expect(tenantRequestMatchesCurrentWorkspace("tenant-a")).toBe(true);
    expect(tenantRequestMatchesCurrentWorkspace("tenant-a", "tenant-a")).toBe(true);
    expect(tenantRequestMatchesCurrentWorkspace("tenant-a", "tenant-b")).toBe(false);
  });
});

describe("AI provider allowlist", () => {
  it("supports the approved providers and rejects arbitrary models", () => {
    expect(providerIds).toEqual(["openai", "anthropic", "google"]);
    expect(isAllowedModel("openai", "gpt-4.1-mini")).toBe(true);
    expect(isAllowedModel("openai", "user-controlled-model")).toBe(false);
  });
});

describe("AI credential database contract", () => {
  const original = readFileSync("supabase/migrations/0003_tenant_ai_provider_credentials.sql", "utf8");
  const perTenant = readFileSync("supabase/migrations/0007_per_tenant_ai_provider_configuration.sql", "utf8");

  it("keeps encrypted credentials inaccessible to browser roles", () => {
    expect(original).toContain("enable row level security");
    expect(original).toContain("revoke all on table public.ai_provider_settings from anon, authenticated");
  });

  it("enforces provider uniqueness and one default per tenant", () => {
    expect(perTenant).toContain("ai_provider_settings(tenant_id, provider)");
    expect(perTenant).toContain("where is_default");
    expect(perTenant).toContain("verification_status");
  });
});
