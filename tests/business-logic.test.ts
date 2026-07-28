import { describe, expect, it } from "vitest";
import { annualPlanPrice, getPlan } from "@/lib/mock/podcastos";
import { canAccessPaidContent, canManageContent, canManageTenant, isPlatformAdmin } from "@/lib/access-control";
import { canAccessRoute, redirectForUnauthorized } from "@/lib/auth";
import { formatCompactNumber, formatCurrency, formatDate } from "@/lib/format";
import { demoRequestSchema } from "@/lib/validation";

describe("pricing logic", () => {
  it("finds plans and computes annual prices without rounding drift", () => {
    expect(getPlan("creator")?.priceLabel).toBe("$49.99");
    expect(annualPlanPrice("creator")).toBe(599.88);
    expect(annualPlanPrice("enterprise")).toBeNull();
  });
});

describe("role and access checks", () => {
  it("separates platform and tenant authority", () => {
    expect(isPlatformAdmin("platform_admin")).toBe(true);
    expect(isPlatformAdmin("tenant_owner")).toBe(false);
    expect(canManageTenant("community_moderator")).toBe(true);
    expect(canManageContent("community_moderator")).toBe(false);
    expect(canManageContent("content_manager")).toBe(true);
  });
  it("enforces member and paid access", () => {
    expect(canAccessPaidContent({ role: "guest", planAccess: "public" })).toBe(true);
    expect(canAccessPaidContent({ role: "guest", planAccess: "member" })).toBe(false);
    expect(canAccessPaidContent({ role: "member", membershipStatus: "active", planAccess: "paid" })).toBe(true);
    expect(canAccessPaidContent({ role: "member", membershipStatus: "past_due", planAccess: "paid" })).toBe(false);
  });
  it("protects application route groups", () => {
    expect(canAccessRoute("/platform-admin", "platform_owner")).toBe(true);
    expect(canAccessRoute("/platform-admin", "tenant_admin")).toBe(false);
    expect(canAccessRoute("/dashboard", "tenant_admin")).toBe(true);
    expect(canAccessRoute("/demo/ai-at-work/member", null)).toBe(false);
    expect(canAccessRoute("/", null)).toBe(true);
    expect(redirectForUnauthorized("/dashboard")).toBe("/login?next=%2Fdashboard");
  });
});

describe("formatting and form validation", () => {
  it("formats supported presentation values", () => {
    expect(formatCurrency(49.99)).toBe("$49.99");
    expect(formatCompactNumber(1284)).toBe("1.3K");
    expect(formatDate("2026-08-12")).toBe("Aug 12, 2026");
  });
  it("accepts a valid demo request and rejects invalid fields", () => {
    expect(demoRequestSchema.safeParse({ name: "Danielle", email: "d@example.com", organization: "Nexx Jenn", audienceSize: "100" }).success).toBe(true);
    const result = demoRequestSchema.safeParse({ name: "D", email: "wrong", organization: "", audienceSize: -1 });
    expect(result.success).toBe(false);
  });
});
