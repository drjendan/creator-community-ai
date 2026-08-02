import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateTrialDaysRemaining, expiredTrialMessage } from "@/lib/trial-constants";

export { expiredTrialMessage } from "@/lib/trial-constants";

export const standardTrialFeatureKeys = [
  "podcasts",
  "courses",
  "resources",
  "events",
  "community",
  "memberships",
  "creator_ai_studio",
  "communication_hub",
  "communication_announcements",
  "communication_direct_messages",
  "communication_email_campaigns",
  "communication_templates",
  "communication_segments",
  "communication_scheduling",
  "communication_reports",
  "communication_byop_email"
] as const;

export type TrialAccessState = {
  subscriptionId: string | null;
  subscriptionType: string;
  subscriptionStatus: string;
  isTrial: boolean;
  isActiveTrial: boolean;
  isExpiredTrial: boolean;
  trialStatus: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialDaysGranted: number | null;
  daysRemaining: number | null;
  canCreate: boolean;
  canUseAi: boolean;
  canCreateCampaigns: boolean;
  canUpload: boolean;
  canInvite: boolean;
};

type SubscriptionRow = {
  id: string;
  status: string;
  trial_status: string | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  trial_days_granted: number | null;
  trial_plan_name: string | null;
  platform_plans: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
};

function relatedPlan(row: SubscriptionRow) {
  return Array.isArray(row.platform_plans) ? row.platform_plans[0] : row.platform_plans;
}

function stateFromRow(row: SubscriptionRow | null, now: Date): TrialAccessState {
  if (!row) {
    return {
      subscriptionId: null,
      subscriptionType: "No subscription",
      subscriptionStatus: "none",
      isTrial: false,
      isActiveTrial: false,
      isExpiredTrial: false,
      trialStatus: null,
      trialStartedAt: null,
      trialEndsAt: null,
      trialDaysGranted: null,
      daysRemaining: null,
      canCreate: true,
      canUseAi: true,
      canCreateCampaigns: true,
      canUpload: true,
      canInvite: true
    };
  }

  const plan = relatedPlan(row);
  const trialStatus = row.trial_status;
  const isTrial = Boolean(
    row.trial_starts_at ||
    trialStatus ||
    row.status === "trialing" ||
    row.status === "expired_trial"
  ) && trialStatus !== "converted";
  const endTime = row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : null;
  const isExpiredTrial = isTrial && (
    row.status === "expired_trial" ||
    trialStatus === "expired" ||
    trialStatus === "cancelled" ||
    (endTime !== null && endTime <= now.getTime())
  );
  const isActiveTrial = isTrial && !isExpiredTrial &&
    ["trialing"].includes(row.status) &&
    ["active", "extended", "pending", null].includes(trialStatus);
  const daysRemaining = isTrial
    ? calculateTrialDaysRemaining(row.trial_ends_at, now)
    : null;
  const subscriptionType = isExpiredTrial
    ? "Expired Trial"
    : isActiveTrial
      ? `${row.trial_plan_name || plan?.name || "Professional"} Trial`
      : plan?.name || "Subscription";

  return {
    subscriptionId: row.id,
    subscriptionType,
    subscriptionStatus: row.status,
    isTrial,
    isActiveTrial,
    isExpiredTrial,
    trialStatus,
    trialStartedAt: row.trial_starts_at,
    trialEndsAt: row.trial_ends_at,
    trialDaysGranted: row.trial_days_granted,
    daysRemaining,
    canCreate: !isExpiredTrial,
    canUseAi: !isExpiredTrial,
    canCreateCampaigns: !isExpiredTrial,
    canUpload: !isExpiredTrial,
    canInvite: !isExpiredTrial
  };
}

export async function getTenantTrialAccess(
  tenantId: string,
  options: { synchronizeExpiration?: boolean; now?: Date } = {}
) {
  const admin = createAdminClient();
  const now = options.now ?? new Date();
  const { data } = await admin
    .from("tenant_subscriptions")
    .select(
      "id,status,trial_status,trial_starts_at,trial_ends_at,trial_days_granted,trial_plan_name,platform_plans(name,slug)"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();
  let row = data as unknown as SubscriptionRow | null;
  const initial = stateFromRow(row, now);

  if (
    options.synchronizeExpiration !== false &&
    row &&
    initial.isExpiredTrial &&
    row.status !== "expired_trial" &&
    row.trial_status !== "cancelled"
  ) {
    const endedAt = row.trial_ends_at || now.toISOString();
    const { data: updated } = await admin
      .from("tenant_subscriptions")
      .update({
        status: "expired_trial",
        trial_status: "expired",
        trial_ended_at: endedAt,
        trial_changed_role: "system",
        updated_at: now.toISOString()
      })
      .eq("id", row.id)
      .select(
        "id,status,trial_status,trial_starts_at,trial_ends_at,trial_days_granted,trial_plan_name,platform_plans(name,slug)"
      )
      .single();
    if (updated) row = updated as unknown as SubscriptionRow;
  }

  return stateFromRow(row, now);
}

export type TrialMutation =
  | "content"
  | "ai"
  | "campaign"
  | "upload"
  | "invitation";

export async function trialMutationError(
  tenantId: string,
  mutation: TrialMutation
) {
  const state = await getTenantTrialAccess(tenantId);
  const allowed = mutation === "ai"
    ? state.canUseAi
    : mutation === "campaign"
      ? state.canCreateCampaigns
      : mutation === "upload"
        ? state.canUpload
        : mutation === "invitation"
          ? state.canInvite
          : state.canCreate;
  return allowed ? null : `${expiredTrialMessage} Existing data remains available in read-only mode.`;
}
