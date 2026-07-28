import { describe, expect, it } from "vitest";
import { calculateOnboardingProgress } from "@/lib/onboarding";

describe("onboarding progress", () => {
  it("uses only completed checklist items", () => {
    expect(calculateOnboardingProgress([{ complete: true }, { complete: false }, { complete: false }, { complete: true }])).toBe(50);
  });

  it("returns zero for a new empty checklist", () => {
    expect(calculateOnboardingProgress([])).toBe(0);
  });
});
