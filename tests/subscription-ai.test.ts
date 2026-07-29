import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canConsumeCredits, creditsRemaining, featureCatalog, membershipTemplates,
  platformPlanSlugs, recommendedMembershipTemplate, tenantTypes, terminologyFor
} from "@/lib/subscriptions";

describe("tenant and subscription configuration", () => {
  it("supports every required tenant and platform plan type", () => {
    expect(tenantTypes).toEqual(expect.arrayContaining(["podcaster", "educator", "coach", "church_ministry", "therapist_wellness", "association", "nonprofit"]));
    expect(platformPlanSlugs).toEqual(["creator", "growth", "professional", "enterprise", "trial", "complimentary", "custom"]);
  });
  it("changes terminology without creating separate applications", () => {
    expect(terminologyFor("educator").audience).toBe("Learners");
    expect(terminologyFor("coach").audience).toBe("Clients");
    expect(terminologyFor("podcaster").primary).toBe("Podcast");
  });
  it("provides all audience membership templates", () => {
    expect(Object.keys(membershipTemplates)).toHaveLength(7);
    expect(membershipTemplates.free_premium.plans.map((plan) => plan.name)).toEqual(["Free", "Premium"]);
    expect(membershipTemplates.free_premium_vip.plans).toHaveLength(3);
    expect(membershipTemplates.nonprofit_faith_based.label).toBe("Nonprofit & Faith-Based Organization");
    expect(membershipTemplates.nonprofit_faith_based.plans.map((plan) => plan.name)).toEqual(["Community Member", "Supporter", "Leadership"]);
    expect(membershipTemplates.custom.plans).toEqual([]);
  });
  it("recommends membership templates from existing business types", () => {
    expect(recommendedMembershipTemplate("nonprofit")).toBe("nonprofit_faith_based");
    expect(recommendedMembershipTemplate("church_ministry")).toBe("nonprofit_faith_based");
    expect(recommendedMembershipTemplate("educator")).toBe("course_membership");
    expect(recommendedMembershipTemplate("coach")).toBe("coaching_program");
    expect(recommendedMembershipTemplate("association")).toBe("association_membership");
    expect(recommendedMembershipTemplate("consultant")).toBe("free_premium");
    expect(recommendedMembershipTemplate("podcaster")).toBe("free_premium_vip");
    expect(recommendedMembershipTemplate("other")).toBe("free_premium_vip");
  });
});

describe("editable membership template migration", () => {
  const migration = readFileSync("supabase/migrations/0008_editable_membership_template_metadata.sql", "utf8");
  it("stores editable, tenant-owned template metadata", () => {
    expect(migration).toContain("is_editable boolean not null default true");
    expect(migration).toContain("created_from_template boolean not null default false");
    expect(migration).toContain("template_key text");
    expect(migration).toContain("benefits jsonb");
    expect(migration).toContain("display_order");
  });
});

describe("AI credits and feature controls", () => {
  it("blocks usage that exceeds an allowance", () => {
    expect(creditsRemaining(100, 25)).toBe(75);
    expect(creditsRemaining(100, 120)).toBe(0);
    expect(canConsumeCredits(100, 95, 5)).toBe(true);
    expect(canConsumeCredits(100, 95, 6)).toBe(false);
  });
  it("exposes only the operational AI feature entitlement", () => {
    const keys = featureCatalog.map((feature) => feature.key);
    expect(keys).toContain("creator_ai_studio");
    expect(keys).not.toEqual(expect.arrayContaining(["member_ai_assistant", "recommendations", "administrator_ai_insights"]));
  });
});

describe("migration security contract", () => {
  const migration = readFileSync("supabase/migrations/0006_subscription_membership_ai_foundation.sql", "utf8");
  it("enables RLS and creates server-side entitlement checks", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("public.has_content_access");
    expect(migration).toContain("public.has_active_audience_subscription");
    expect(migration).toContain("authorized published episodes");
    expect(migration).toContain("members read own recommendations");
  });
  it("keeps platform and audience subscriptions as separate tables", () => {
    expect(migration).toContain("alter table public.tenant_subscriptions");
    expect(migration).toContain("alter table public.tenant_membership_plans");
    expect(migration).toContain("alter table public.member_subscriptions");
  });
});
