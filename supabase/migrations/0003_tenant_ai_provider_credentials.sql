-- Tenant-owned AI provider credentials.
-- Encrypted API keys are intentionally inaccessible through the public API.
-- Only trusted server code using the service role may read or write this table.

create table if not exists public.ai_provider_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'google')),
  model text not null,
  encrypted_api_key text not null,
  key_last_four text not null check (char_length(key_last_four) = 4),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create index if not exists idx_ai_provider_settings_tenant_id
  on public.ai_provider_settings(tenant_id);

alter table public.ai_provider_settings enable row level security;

-- Do not add client-facing policies. Server routes authenticate the user,
-- verify an owner/admin membership, and only then use the service role.
revoke all on table public.ai_provider_settings from anon, authenticated;

