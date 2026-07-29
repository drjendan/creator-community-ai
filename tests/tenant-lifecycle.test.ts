import { describe, expect, it } from "vitest";
import { canTransitionTenant, tenantDeletionBlockers } from "@/lib/tenant-lifecycle";

describe("tenant lifecycle safeguards", () => {
  it("allows only valid reversible lifecycle transitions", () => {
    expect(canTransitionTenant("active", "suspend")).toBe(true);
    expect(canTransitionTenant("pending", "suspend")).toBe(true);
    expect(canTransitionTenant("suspended", "reactivate")).toBe(true);
    expect(canTransitionTenant("archived", "restore")).toBe(true);
    expect(canTransitionTenant("active", "restore")).toBe(false);
    expect(canTransitionTenant("deleted", "delete")).toBe(false);
  });

  it("blocks deletion for unresolved billing obligations", () => {
    expect(tenantDeletionBlockers({
      activeStripeSubscriptions: 1,
      unsettledPayments: 2,
      pendingRefunds: 1
    })).toEqual([
      "Active Stripe subscriptions must be canceled or completed.",
      "Unsettled payments must be resolved.",
      "Pending refunds must be completed."
    ]);
    expect(tenantDeletionBlockers({
      activeStripeSubscriptions: 0,
      unsettledPayments: 0,
      pendingRefunds: 0
    })).toEqual([]);
  });
});
