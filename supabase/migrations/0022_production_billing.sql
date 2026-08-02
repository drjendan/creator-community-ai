-- Milestone 6: production subscription identifiers and idempotent billing event state.

alter table public.platform_plans
  add column if not exists stripe_monthly_price_id text,
  add column if not exists stripe_annual_price_id text;

alter table public.tenant_membership_plans
  add column if not exists stripe_product_id text,
  add column if not exists stripe_monthly_price_id text,
  add column if not exists stripe_annual_price_id text,
  add column if not exists stripe_prices_synced_at timestamptz;

alter table public.tenant_subscriptions
  add column if not exists stripe_checkout_session_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists latest_invoice_status text;

alter table public.member_subscriptions
  add column if not exists stripe_checkout_session_id text,
  add column if not exists billing_interval text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists latest_invoice_status text;
alter table public.member_subscriptions drop constraint if exists member_subscriptions_billing_interval_check;
alter table public.member_subscriptions add constraint member_subscriptions_billing_interval_check
  check (billing_interval is null or billing_interval in ('month','year'));

alter table public.payments
  add column if not exists plan_id uuid references public.tenant_membership_plans(id) on delete set null,
  add column if not exists member_subscription_id uuid references public.member_subscriptions(id) on delete set null,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_invoice_id text,
  add column if not exists application_fee_amount numeric(12,2) not null default 0;

alter table public.billing_events
  add column if not exists scope text not null default 'member',
  add column if not exists stripe_account_id text,
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text;
alter table public.billing_events drop constraint if exists billing_events_scope_check;
alter table public.billing_events add constraint billing_events_scope_check check (scope in ('platform','member','connect'));

create unique index if not exists uq_tenant_subscriptions_stripe_subscription
  on public.tenant_subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;
create unique index if not exists uq_member_subscriptions_stripe_subscription
  on public.member_subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;
create unique index if not exists uq_member_subscriptions_checkout_session
  on public.member_subscriptions(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists uq_payments_stripe_invoice
  on public.payments(tenant_id,stripe_invoice_id) where stripe_invoice_id is not null;
create index if not exists idx_billing_events_scope_created
  on public.billing_events(scope,created_at desc);
