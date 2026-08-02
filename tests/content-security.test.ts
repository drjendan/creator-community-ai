import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultTenantFeatures, getTenantEntitlements } from "@/lib/feature-entitlements";

function entitlementClient(rows: { feature_key: string; enabled: boolean }[]) {
  return {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: rows })
      })
    })
  } as unknown as SupabaseClient;
}

describe("tenant content entitlements", () => {
  it("enables missing legacy core modules without overriding explicit plan restrictions", async () => {
    const entitlements = await getTenantEntitlements("tenant-1", entitlementClient([
      { feature_key: "podcasts", enabled: false },
      { feature_key: "community", enabled: true }
    ]));
    expect(entitlements.get("podcasts")).toBe(false);
    expect(entitlements.get("community")).toBe(true);
    for (const key of defaultTenantFeatures.filter((key) => key !== "podcasts")) {
      expect(entitlements.get(key)).toBe(true);
    }
  });
});

describe("tenant content database isolation", () => {
  const migration = readFileSync("supabase/migrations/0015_tenant_content_completion.sql", "utf8");
  const contentRoute = readFileSync("app/api/tenant-content/[type]/route.ts", "utf8");
  const structureRoute = readFileSync("app/api/courses/[courseId]/structure/route.ts", "utf8");
  const configurationRoute = readFileSync("app/api/content-admin/[resource]/route.ts", "utf8");

  it("backfills only absent entitlement rows and preserves explicit disabled overrides", () => {
    expect(migration).toContain("on conflict (tenant_id, feature_key) do nothing");
    expect(migration).not.toContain("on conflict (tenant_id, feature_key) do update");
  });

  it("gives specialized managers narrowly scoped course and event policies", () => {
    expect(migration).toContain("public.can_manage_course_content(tenant_id)");
    expect(migration).toContain("public.can_manage_event_content(tenant_id)");
    expect(migration).not.toMatch(/create or replace function public\.can_manage_tenant[\s\S]+course_manager/);
  });

  it("scopes every content mutation path to the active tenant", () => {
    for (const route of [contentRoute, structureRoute, configurationRoute]) {
      expect(route).toContain('.eq("tenant_id", context.tenant.id)');
    }
    expect(contentRoute).toContain("tenant_id: context.tenant.id");
    expect(structureRoute).toContain("tenant_id: context.tenant.id");
    expect(configurationRoute).toContain("tenant_id: context.tenant.id");
  });
});
