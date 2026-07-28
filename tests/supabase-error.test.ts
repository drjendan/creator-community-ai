import { describe, expect, it } from "vitest";
import { databaseErrorMessage, isMissingEditableMembershipMetadata } from "@/lib/supabase/error";

describe("structured Supabase errors", () => {
  it("shows the useful message instead of object Object", () => {
    expect(databaseErrorMessage({
      code: "PGRST204",
      message: "Could not find the 'display_order' column in the schema cache",
      details: null,
      hint: null
    })).toBe("Could not find the 'display_order' column in the schema cache");
  });

  it("detects a missing editable membership migration", () => {
    expect(isMissingEditableMembershipMetadata({
      message: "Could not find the 'benefits' column in the schema cache"
    })).toBe(true);
    expect(isMissingEditableMembershipMetadata({ message: "duplicate key value" })).toBe(false);
  });
});
