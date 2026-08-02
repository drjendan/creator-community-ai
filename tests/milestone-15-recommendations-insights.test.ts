import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0031_recommendations_insights.sql");
const recommendations = read("app/api/recommendations/route.ts");
const memberUi = read("components/tenant/MemberRecommendations.tsx");
const insights = read("app/api/insights/route.ts");
const insightUi = read("components/dashboard/AdminInsightsManager.tsx");

describe("Milestone 15 recommendations and administrator insights", () => {
  it("adds explainable recommendation lifecycle and reviewable insight metadata", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 31)");
    for (const value of ["explanation", "feedback", "dismissed_at", "insight_key", "recommended_action", "reviewed_by"]) expect(migration).toContain(value);
    expect(migration).toContain("tenant.insights.manage");
    expect(migration).toContain("validate_member_recommendation_target");
    expect(migration).toContain('drop policy if exists "tenant managers update" on public.administrator_ai_insights');
    expect(migration).toContain('for select using(user_id=auth.uid())');
  });

  it("limits source discovery to the signed-in member's RLS client and scopes trusted writes", () => {
    expect(recommendations).toContain("getTenantMemberContext");
    expect(recommendations).toContain('context.supabase.from("episodes")');
    expect(recommendations).toContain('.eq("user_id", context.user.id)');
    expect(recommendations).toContain('.eq("tenant_id", context.tenant.id)');
    expect(recommendations).toContain('source: "rules"');
  });

  it("ships member explanations, dismissal, and usefulness feedback", () => {
    for (const value of ["Why recommended", "Dismiss", "helpful", "not_helpful"]) expect(memberUi).toContain(value);
  });

  it("qualifies real tenant metrics and requires human insight review", () => {
    expect(insights).toContain('getActiveTenantWithPermission("tenant.analytics.view")');
    expect(insights).toContain('getActiveTenantWithPermission("tenant.insights.manage")');
    expect(insights).toContain("does not establish churn intent");
    expect(insights).toContain("tenant.insight.${parsed.data.action}");
    for (const value of ["Mark reviewed", "Dismiss", "Reopen", "A person must review"]) expect(insightUi).toContain(value);
  });
});
