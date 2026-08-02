import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

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

function connectClientId() {
  const value = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!value) throw new Error("Stripe Connect Standard onboarding is not configured.");
  return value;
}

export async function retrieveConnectedAccount(accountId: string) {
  return stripeRequest<StripeAccountSnapshot>(`/accounts/${encodeURIComponent(accountId)}`);
}

function connectStateSecret() {
  const value = process.env.STRIPE_CONNECT_STATE_SECRET;
  if (!value || value.length < 32) throw new Error("Stripe Connect state signing is not configured.");
  return value;
}

export function createConnectState(tenantId: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({ tenantId, userId, expiresAt: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", connectStateSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyConnectState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", connectStateSecret()).update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { tenantId?: string; userId?: string; expiresAt?: number };
  if (!parsed.tenantId || !parsed.userId || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
  return { tenantId: parsed.tenantId, userId: parsed.userId };
}

export function createStandardConnectUrl(state: string, redirectUri: string, email: string) {
  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", connectClientId());
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  if (email) url.searchParams.set("stripe_user[email]", email);
  return url.toString();
}

export async function exchangeStandardConnectCode(code: string) {
  const response = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${stripeSecret()}:`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, grant_type: "authorization_code" }),
    cache: "no-store"
  });
  const result = await response.json() as { stripe_user_id?: string; error_description?: string };
  if (!response.ok || !result.stripe_user_id) throw new Error(result.error_description ?? "Stripe account authorization failed.");
  return result.stripe_user_id;
}

export async function deauthorizeStandardAccount(accountId: string) {
  const response = await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${stripeSecret()}:`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: connectClientId(), stripe_user_id: accountId }),
    cache: "no-store"
  });
  const result = await response.json() as { error_description?: string };
  if (!response.ok) throw new Error(result.error_description ?? "Stripe account disconnection failed.");
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
