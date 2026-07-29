import "server-only";

export type StripeAccountSnapshot = {
  id: string;
  details_submitted?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  capabilities?: Record<string, string>;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    disabled_reason?: string | null;
  };
};

function stripeSecret() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("Stripe Connect is not configured for this UpNexx environment.");
  return secret;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers
    },
    cache: "no-store"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message ?? "Stripe rejected the request.");
  return result as T;
}

export async function createConnectedAccount(email: string) {
  const body = new URLSearchParams({
    type: "express",
    email,
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true"
  });
  return stripeRequest<StripeAccountSnapshot>("/accounts", { method: "POST", body });
}

export async function retrieveConnectedAccount(accountId: string) {
  return stripeRequest<StripeAccountSnapshot>(`/accounts/${encodeURIComponent(accountId)}`);
}

export async function createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const body = new URLSearchParams({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
    collect: "eventually_due"
  });
  return stripeRequest<{ url: string; expires_at: number }>("/account_links", { method: "POST", body });
}

export function stripeAccountValues(account: StripeAccountSnapshot) {
  const cardStatus = account.capabilities?.card_payments ?? "inactive";
  const transfersStatus = account.capabilities?.transfers ?? "inactive";
  const platformFeeActive = Number(process.env.STRIPE_PLATFORM_FEE_BPS ?? "0") > 0;
  let status = "setup_started";
  if (account.requirements?.disabled_reason) status = "restricted";
  else if (account.charges_enabled && cardStatus === "active" && platformFeeActive) status = "payments_enabled";
  else if (account.details_submitted) status = "action_required";
  return {
    stripe_account_id: account.id,
    status,
    details_submitted: Boolean(account.details_submitted),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    card_payments_status: cardStatus,
    transfers_status: transfersStatus,
    requirements: account.requirements ?? {},
    capabilities: account.capabilities ?? {},
    platform_fee_active: platformFeeActive,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function canAcceptPayments(record: {
  charges_enabled?: boolean;
  card_payments_status?: string;
  platform_fee_active?: boolean;
}) {
  return record.charges_enabled === true &&
    record.card_payments_status === "active" &&
    record.platform_fee_active === true;
}
