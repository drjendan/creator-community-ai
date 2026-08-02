import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dashboardNavItems, platformNavItems } from "@/lib/navigation";
import { terminology } from "@/lib/terminology";

describe("Milestone 3 admin hub and analytics contracts", () => {
  it("promotes the tenant dashboard to the permission-gated Tenant Admin Hub", () => {
    expect(dashboardNavItems[0]).toMatchObject({
      label: terminology.tenantAdminHub,
      href: "/dashboard",
      permission: "tenant.dashboard.view"
    });
    const page = readFileSync("app/dashboard/page.tsx", "utf8");
    expect(page).toContain("terminology.tenantAdminHub");
    expect(page).toContain('aria-label="Tenant workspace summary"');
  });

  it("exposes platform analytics only through its dedicated permission", () => {
    expect(platformNavItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: "Platform Analytics",
        href: "/platform-admin/analytics",
        permission: "platform.analytics.view"
      })
    ]));
    const page = readFileSync("app/platform-admin/analytics/page.tsx", "utf8");
    const data = readFileSync("lib/dashboard-data.ts", "utf8");
    expect(page).toContain("getPlatformAnalyticsData");
    expect(data).toContain('getPlatformAdministrator("platform.analytics.view")');
  });

  it("calculates tenant analytics from tenant-scoped production records", () => {
    const data = readFileSync("lib/dashboard-data.ts", "utf8");
    expect(data).toContain('getActiveTenantWithPermission("tenant.analytics.view")');
    expect(data).toContain('.from("course_enrollments")');
    expect(data).toContain('.from("lesson_progress")');
    expect(data).toContain('.from("email_campaign_recipients")');
    expect(data).toContain('.eq("tenant_id", tenantId)');
  });
});
