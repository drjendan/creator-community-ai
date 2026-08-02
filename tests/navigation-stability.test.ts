import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dashboardNavItems,
  platformNavItems,
  platformNavigationGroups,
  tenantNavigationGroups
} from "@/lib/navigation";
import { terminology } from "@/lib/terminology";

describe("Milestone 1 navigation and stability contracts", () => {
  it("uses the approved tenant terminology and consolidated primary navigation", () => {
    expect(dashboardNavItems[0]).toMatchObject({ label: terminology.tenantAdminHub, href: "/dashboard" });
    expect(dashboardNavItems.some((item) => item.label === "Overview")).toBe(false);
    expect(dashboardNavItems.filter((item) => item.label === terminology.communicationHub)).toHaveLength(1);
    expect(dashboardNavItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: terminology.contentLibrary, group: tenantNavigationGroups.content }),
      expect.objectContaining({ label: terminology.aiStudio, group: tenantNavigationGroups.content }),
      expect.objectContaining({ label: "Billing", group: tenantNavigationGroups.commerce })
    ]));
  });

  it("uses the approved platform terminology and a working Billing & Usage target", () => {
    expect(platformNavItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: terminology.platformAdminHub, href: "/platform-admin" }),
      expect.objectContaining({ label: terminology.upnexxTenants, href: "/platform-admin/tenants" }),
      expect.objectContaining({ label: terminology.platformTeam, href: "/platform-admin/team" }),
      expect.objectContaining({
        label: terminology.plansAndEntitlements,
        href: "/platform-admin/billing",
        group: platformNavigationGroups.billing
      })
    ]));
  });

  it("provides shared footer, health, correlation, and error-boundary surfaces", () => {
    const footer = readFileSync("components/layout/AppFooter.tsx", "utf8");
    const authFooter = readFileSync("components/legal/AuthLegalLinks.tsx", "utf8");
    const middleware = readFileSync("middleware.ts", "utf8");
    const health = readFileSync("app/api/health/route.ts", "utf8");
    expect(footer).toContain("copyrightText");
    expect(footer).toContain('aria-label="Legal links"');
    expect(authFooter).toContain("copyrightText");
    expect(authFooter).toContain("/acceptable-use");
    expect(middleware).toContain("x-correlation-id");
    expect(health).toContain('status: "healthy"');
    expect(readFileSync("app/error.tsx", "utf8")).toContain("Try again");
    expect(readFileSync("app/global-error.tsx", "utf8")).toContain("Try Again");
    expect(readFileSync("app/not-found.tsx", "utf8")).toContain("Page Not Found");
  });
});
