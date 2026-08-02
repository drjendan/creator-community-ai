import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calculateTrialDaysRemaining,
  expiredTrialMessage
} from "@/lib/trial-constants";
import { dashboardNavItems } from "@/lib/navigation";

describe("full trial experience", () => {
  it("calculates remaining calendar days on the server without going negative", () => {
    const now = new Date("2026-07-30T12:00:00.000Z");
    expect(calculateTrialDaysRemaining("2026-07-31T12:00:00.000Z", now)).toBe(1);
    expect(calculateTrialDaysRemaining("2026-08-01T11:59:59.000Z", now)).toBe(2);
    expect(calculateTrialDaysRemaining("2026-07-29T12:00:00.000Z", now)).toBe(0);
    expect(calculateTrialDaysRemaining(null, now)).toBeNull();
  });

  it("uses the required expired-trial notice", () => {
    expect(expiredTrialMessage).toBe(
      "Your UpNexx free trial has ended. Select a subscription plan to continue."
    );
  });

  it("stores the complete lifecycle and never deletes tenant data", () => {
    const migration = readFileSync(
      "supabase/migrations/0017_full_trial_experience.sql",
      "utf8"
    );
    expect(migration).toContain("create table if not exists public.trial_history");
    expect(migration).toContain("'started','extended','ended','expired','converted'");
    expect(migration).toContain("tenant_subscription_trial_history");
    expect(migration).toContain("'platform.trial.' || event_name");
    expect(migration).toContain("on conflict (tenant_id, feature_key) do update");
    expect(migration).toContain("public.tenant_trial_allows_mutation");
    expect(migration).toContain("as restrictive for insert");
    expect(migration).not.toMatch(/delete\s+from\s+public\.tenants/i);
  });

  it("guards every expired-trial mutation category", () => {
    const files = {
      content: readFileSync("app/api/tenant-content/[type]/route.ts", "utf8"),
      courseStructure: readFileSync("app/api/courses/[courseId]/structure/route.ts", "utf8"),
      ai: readFileSync("app/api/ai/generate/route.ts", "utf8"),
      campaigns: readFileSync("lib/communications/campaign-service.ts", "utf8"),
      uploads: readFileSync("app/api/tenant-assets/route.ts", "utf8"),
      invitations: readFileSync("app/api/team/route.ts", "utf8")
    };
    expect(files.content).toContain('trialMutationError(context.tenant.id, "content")');
    expect(files.courseStructure).toContain('trialMutationError(context.tenant.id, "content")');
    expect(files.ai).toContain('trialMutationError(context.tenant.id, "ai")');
    expect(files.campaigns).toContain('trialMutationError(tenantId, "campaign")');
    expect(files.uploads).toContain('trialMutationError(context.tenant.id, "upload")');
    expect(files.invitations).toContain('trialMutationError(context.tenant.id, "invitation")');
  });

  it("keeps billing and support available in dashboard navigation", () => {
    expect(dashboardNavItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Billing", href: "/dashboard/billing" }),
      expect.objectContaining({ label: "Support", href: "/dashboard/support" })
    ]));
  });
});
