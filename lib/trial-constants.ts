export const expiredTrialMessage =
  "Your UpNexx free trial has ended. Select a subscription plan to continue.";

export function calculateTrialDaysRemaining(
  trialEndsAt: string | null,
  now = new Date()
) {
  if (!trialEndsAt) return null;
  const endTime = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(endTime)) return null;
  return Math.max(0, Math.ceil((endTime - now.getTime()) / 86400000));
}
