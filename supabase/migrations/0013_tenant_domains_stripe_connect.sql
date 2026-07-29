-- Tenant subdomain metadata and optional-later Stripe Connect onboarding.
-- Apply after 0012_remove_platform_logo_from_tenants.sql.

alter table public.tenant_domains
  add column if not exists domain_type text not null default 'upnexx_subdomain',
  add column if not exists verified_at timestamptz,
  add column if not exists verification_token text,
  add column if not exists ssl_status text not null default 'pending';

alter table public.tenant_domains drop constraint if exists tenant_domains_domain_type_check;
alter table public.tenant_domains add constraint tenant_domains_domain_type_check
  check (domain_type in ('upnexx_subdomain','custom'));
alter table public.tenant_domains drop constraint if exists tenant_domains_ssl_status_check;
alter table public.tenant_domains add constraint tenant_domains_ssl_status_check
  check (ssl_status in ('pending','provisioning','active','failed'));

create unique index if not exists uq_tenant_primary_domain
  on public.tenant_domains(tenant_id) where is_primary;

create table if not exists public.tenant_stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  stripe_account_id text unique,
  status text not null default 'not_connected',
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  card_payments_status text,
  transfers_status text,
  requirements jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '{}'::jsonb,
  platform_fee_active boolean not null default false,
  last_synced_at timestamptz,
  disconnected_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  disconnected_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_stripe_accounts drop constraint if exists tenant_stripe_accounts_status_check;
alter table public.tenant_stripe_accounts add constraint tenant_stripe_accounts_status_check
  check (status in (
    'not_connected','setup_started','action_required','connected',
    'payments_enabled','restricted','disconnected'
  ));

alter table public.tenant_stripe_accounts enable row level security;
drop policy if exists "tenant administrators read stripe status" on public.tenant_stripe_accounts;
drop policy if exists "tenant administrators insert stripe status" on public.tenant_stripe_accounts;
drop policy if exists "tenant administrators update stripe status" on public.tenant_stripe_accounts;
create policy "tenant administrators read stripe status"
  on public.tenant_stripe_accounts for select
  using (public.can_administer_tenant(tenant_id));

revoke all on table public.tenant_stripe_accounts from anon;

alter table public.tenant_membership_plans
  add column if not exists payment_setup_required boolean not null default false;

create index if not exists idx_tenant_stripe_accounts_tenant
  on public.tenant_stripe_accounts(tenant_id);
