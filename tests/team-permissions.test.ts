import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  platformRoleHasPermission,
  tenantRoleHasPermission
} from "@/lib/permissions";
import { dashboardNavItems } from "@/lib/navigation";

const migration = readFileSync("supabase/migrations/0020_team_permissions_and_access_history.sql", "utf8");
const tenantContext = readFileSync("lib/tenant-context.ts", "utf8");
const tenantRoute = readFileSync("app/api/team/route.ts", "utf8");
const acceptanceRoute = readFileSync("app/api/team/invitations/accept/route.ts", "utf8");

describe("Milestone 2 permission and access-history contracts", () => {
  it("maps the expanded platform permissions without allowing owner grants", () => {
    expect(platformRoleHasPermission("platform_admin", "platform.communication.manage")).toBe(true);
    expect(platformRoleHasPermission("platform_support", "platform.dashboard.view")).toBe(true);
    expect(platformRoleHasPermission("platform_admin", "platform.team.grant_owner")).toBe(false);
  });

  it("keeps publish, team, and billing capabilities role-specific", () => {
    expect(tenantRoleHasPermission("content_manager", "tenant.content.publish")).toBe(true);
    expect(tenantRoleHasPermission("contributor", "tenant.content.publish")).toBe(false);
    expect(tenantRoleHasPermission("viewer", "tenant.team.view")).toBe(false);
    expect(tenantRoleHasPermission("billing_admin", "tenant.billing.manage")).toBe(true);
  });

  it("preserves legacy role access while keeping those roles out of new invitations", () => {
    expect(tenantRoleHasPermission("course_manager", "tenant.courses.manage")).toBe(true);
    expect(migration).toContain("Legacy course administration role");
    expect(migration).toContain("'inactive'");
  });

  it("resolves tenant permissions from the database catalog", () => {
    expect(tenantContext).toContain('.from("tenant_role_permissions")');
    expect(tenantContext).toContain("getTenantPermissionSet");
    expect(dashboardNavItems.every((item) => item.label === "Support" || Boolean(item.permission))).toBe(true);
  });

  it("adds tenant-scoped access history with read-only browser policy", () => {
    expect(migration).toContain("create table if not exists public.tenant_access_history");
    expect(migration).toContain("public.has_tenant_permission(tenant_id,'tenant.team.view')");
    expect(migration).toContain("enable row level security");
    expect(migration).not.toMatch(/create policy[^;]+tenant_access_history for (insert|update|delete)/i);
    expect(tenantRoute).toContain('.from("tenant_access_history").insert');
    expect(acceptanceRoute).toContain('.from("tenant_access_history").insert');
  });

  it("enforces action-specific tenant team permissions and surfaces email warnings", () => {
    expect(tenantRoute).toContain('getActiveTenantWithPermission("tenant.team.view")');
    expect(tenantRoute).toContain('"tenant.team.manage_roles"');
    expect(tenantRoute).toContain('"tenant.team.suspend"');
    expect(tenantRoute).toContain('"tenant.team.remove"');
    expect(tenantRoute).toContain("notification email was not delivered");
  });
});
