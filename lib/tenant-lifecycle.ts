export type TenantLifecycleStatus = "pending" | "active" | "suspended" | "archived" | "deleted";
export type TenantLifecycleAction = "suspend" | "reactivate" | "archive" | "restore" | "delete";

const transitions: Record<Exclude<TenantLifecycleAction, "delete">, TenantLifecycleStatus[]> = {
  suspend: ["pending", "active"],
  reactivate: ["suspended"],
  archive: ["pending", "active", "suspended"],
  restore: ["archived"]
};

export function canTransitionTenant(status: TenantLifecycleStatus, action: TenantLifecycleAction) {
  if (action === "delete") return status !== "deleted";
  return transitions[action].includes(status);
}

export function tenantDeletionBlockers(values: {
  activeStripeSubscriptions: number;
  unsettledPayments: number;
  pendingRefunds: number;
}) {
  return [
    ...(values.activeStripeSubscriptions ? ["Active Stripe subscriptions must be canceled or completed."] : []),
    ...(values.unsettledPayments ? ["Unsettled payments must be resolved."] : []),
    ...(values.pendingRefunds ? ["Pending refunds must be completed."] : [])
  ];
}
