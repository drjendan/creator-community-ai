-- Secure multi-provider configuration for tenant-owned AI credentials.
-- Credentials remain service-role only and are never exposed through PostgREST.

alter table public.ai_provider_settings
  drop constraint if exists ai_provider_settings_tenant_id_key;

alter table public.ai_provider_settings
  add column if not exists is_default boolean not null default true,
  add column if not exists verification_status text not null default 'not_verified',
  add column if not exists last_verified_at timestamptz,
  add column if not exists last_verification_error_code text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_context text not null default 'tenant';

alter table public.ai_provider_settings
  drop constraint if exists ai_provider_settings_verification_status_check;
alter table public.ai_provider_settings
  add constraint ai_provider_settings_verification_status_check
  check (verification_status in ('not_verified','verified','failed','key_replacement_required'));
alter table public.ai_provider_settings
  drop constraint if exists ai_provider_settings_updated_context_check;
alter table public.ai_provider_settings
  add constraint ai_provider_settings_updated_context_check
  check (updated_context in ('tenant','platform'));

create unique index if not exists idx_ai_provider_settings_tenant_provider
  on public.ai_provider_settings(tenant_id, provider);

create unique index if not exists idx_ai_provider_settings_one_default
  on public.ai_provider_settings(tenant_id)
  where is_default;

create index if not exists idx_ai_provider_settings_tenant_enabled
  on public.ai_provider_settings(tenant_id, enabled);

-- Existing configurations remain stored but must be verified before use.
update public.ai_provider_settings
set verification_status = coalesce(verification_status, 'not_verified');

-- Missing flag means tenant administrators may manage their own credentials.
-- Platform administrators can add this flag with enabled=false for managed-service tenants.
