import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertDemoWorkspaceSeedBoundary,
  canSeedDemoWorkspace,
  customerProvisioningTables,
  tenantBusinessDataTables
} from "@/lib/zero-demo-data";

const read = (path: string) => readFileSync(path, "utf8");

describe("Zero Demo Data policy", () => {
  it("keeps customer provisioning limited to system configuration", () => {
    const provisioning = read("app/platform-admin/tenants/actions.ts");
    expect(provisioning).toContain('workspace_kind: "customer"');
    expect(provisioning).toContain('initialization_policy: "zero_demo_data"');
    for (const table of tenantBusinessDataTables) {
      expect(provisioning).not.toContain(`from("${table}").insert`);
    }
    expect(customerProvisioningTables).toContain("tenant_branding");
    expect(customerProvisioningTables).toContain("tenant_feature_entitlements");
  });

  it("requires both an explicit demo flag and the dedicated hostname", () => {
    expect(canSeedDemoWorkspace("demo", "demo.upnexx.net")).toBe(true);
    expect(canSeedDemoWorkspace("customer", "demo.upnexx.net")).toBe(false);
    expect(canSeedDemoWorkspace("demo", "customer.upnexx.net")).toBe(false);
    expect(() => assertDemoWorkspaceSeedBoundary("customer", "demo.upnexx.net")).toThrow(/explicitly marked demo workspace/);
  });

  it("adds a guarded database boundary and removes only untouched unused seed records", () => {
    const migration = read("supabase/migrations/0041_zero_demo_data_policy.sql");
    expect(migration).toContain("workspace_kind text not null default 'customer'");
    expect(migration).toContain("assert_demo_workspace_seed_boundary");
    expect(migration).toContain("grant execute on function public.assert_demo_workspace_seed_boundary(uuid) to service_role");
    expect(migration).not.toMatch(/insert\s+into\s+public\.(tenants|courses|episodes|tenant_membership_plans)/i);
    expect(migration).toContain("automation.created_at = automation.updated_at");
    expect(migration).toContain("template.created_at = template.updated_at");
    expect(migration).toContain("plan.created_at = plan.updated_at");
    expect(migration).toContain("not exists (\n    select 1 from public.member_subscriptions");
  });

  it("renders explicit empty analytics instead of invented metrics", () => {
    const analytics = read("app/dashboard/analytics/page.tsx");
    expect(analytics).toContain("No data available yet");
    expect(analytics).toContain("never fabricates reporting data");
    expect(analytics).not.toContain("Math.random");
  });
});
