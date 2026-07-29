-- Platform-controlled tenant lifecycle and original owner invitation tracking.
-- Apply after 0013_tenant_domains_stripe_connect.sql.

alter table public.tenants drop constraint if exists tenants_status_check;
alter table public.tenants
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null,
  add column if not exists suspension_reason text,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deletion_reason text,
  add column if not exists owner_invited_at timestamptz,
  add column if not exists owner_invitation_last_sent_at timestamptz,
  add column if not exists owner_invitation_send_count integer not null default 0,
  add column if not exists owner_activated_at timestamptz;

alter table public.tenants
  add constraint tenants_status_check
  check (status in ('pending','active','suspended','archived','deleted'));

update public.tenants
set owner_invited_at = coalesce(owner_invited_at, created_at)
where exists (
  select 1
  from public.tenant_memberships membership
  where membership.tenant_id = tenants.id
    and membership.role = 'tenant_owner'
);

create table if not exists public.platform_tenant_deletion_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  tenant_name text not null,
  tenant_slug text not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  deletion_reason text not null,
  preflight_snapshot jsonb not null default '{}'::jsonb,
  retention_mode text not null default 'tombstone',
  check (retention_mode in ('tombstone'))
);

create index if not exists idx_platform_tenant_deletion_records_tenant
  on public.platform_tenant_deletion_records(tenant_id, deleted_at desc);

alter table public.platform_tenant_deletion_records enable row level security;
revoke all on table public.platform_tenant_deletion_records from anon, authenticated;

create index if not exists idx_tenants_lifecycle_status
  on public.tenants(status, created_at);
