import "server-only";

type StripeObject = Record<string, unknown> & { id: string };

function secret() {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("Stripe billing is not configured for this environment.");
  return value;
}

async function request<T>(path: string, body: URLSearchParams, options: { accountId?: string; idempotencyKey?: string } = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options.accountId ? { "Stripe-Account": options.accountId } : {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
    },
    body,
    cache: "no-store"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message ?? "Stripe rejected the billing request.");
  return result as T;
}

export async function syncConnectedMembershipPrices(input: {
  accountId: string;
  tenantId: string;
  planId: string;
  name: string;
  description: string;
  currency: string;
  monthlyAmount: number;
  annualAmount: number;
  existingProductId?: string | null;
  createMonthlyPrice: boolean;
  createAnnualPrice: boolean;
}) {
  const metadata = { "metadata[tenant_id]": input.tenantId, "metadata[plan_id]": input.planId };
  let productId = input.existingProductId ?? null;
  if (!productId) {
    const product = await request<StripeObject>("/products", new URLSearchParams({ name: input.name, description: input.description, ...metadata }), { accountId: input.accountId, idempotencyKey: `membership-product-${input.planId}` });
    productId = product.id;
  } else {
    await request<StripeObject>(`/products/${encodeURIComponent(productId)}`, new URLSearchParams({ name: input.name, description: input.description, active: "true" }), { accountId: input.accountId });
  }
  let monthlyPriceId: string | undefined;
  let annualPriceId: string | undefined;
  if (input.createMonthlyPrice && input.monthlyAmount > 0) {
    const price = await request<StripeObject>("/prices", new URLSearchParams({ product: productId, currency: input.currency.toLowerCase(), unit_amount: String(Math.round(input.monthlyAmount * 100)), "recurring[interval]": "month", ...metadata }), { accountId: input.accountId, idempotencyKey: `membership-price-month-${input.planId}-${Math.round(input.monthlyAmount * 100)}-${input.currency}` });
    monthlyPriceId = price.id;
  }
  if (input.createAnnualPrice && input.annualAmount > 0) {
    const price = await request<StripeObject>("/prices", new URLSearchParams({ product: productId, currency: input.currency.toLowerCase(), unit_amount: String(Math.round(input.annualAmount * 100)), "recurring[interval]": "year", ...metadata }), { accountId: input.accountId, idempotencyKey: `membership-price-year-${input.planId}-${Math.round(input.annualAmount * 100)}-${input.currency}` });
    annualPriceId = price.id;
  }
  return { productId, monthlyPriceId, annualPriceId };
}

export async function createSubscriptionCheckout(input: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
  customerEmail?: string | null;
  tenantId: string;
  metadata: Record<string, string>;
  accountId?: string;
  applicationFeeBps?: number;
  trialDays?: number;
  idempotencyKey: string;
}) {
  const body = new URLSearchParams({ mode: "subscription", success_url: input.successUrl, cancel_url: input.cancelUrl, "line_items[0][price]": input.priceId, "line_items[0][quantity]": "1", "subscription_data[metadata][tenant_id]": input.tenantId });
  if (input.customerId) body.set("customer", input.customerId);
  else if (input.customerEmail) body.set("customer_email", input.customerEmail);
  for (const [key, value] of Object.entries(input.metadata)) {
    body.set(`metadata[${key}]`, value);
    body.set(`subscription_data[metadata][${key}]`, value);
  }
  if (input.applicationFeeBps && input.applicationFeeBps > 0) body.set("subscription_data[application_fee_percent]", String(input.applicationFeeBps / 100));
  if (input.trialDays && input.trialDays > 0) body.set("subscription_data[trial_period_days]", String(input.trialDays));
  return request<{ id: string; url: string }>("/checkout/sessions", body, { accountId: input.accountId, idempotencyKey: input.idempotencyKey });
}

export async function createCustomerPortal(input: { customerId: string; returnUrl: string; accountId?: string }) {
  return request<{ url: string }>("/billing_portal/sessions", new URLSearchParams({ customer: input.customerId, return_url: input.returnUrl }), { accountId: input.accountId });
}
