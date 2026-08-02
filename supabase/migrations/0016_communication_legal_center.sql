-- Restore Communication Hub defaults and add the versioned UpNexx Legal Center.

update public.tenant_feature_entitlements
set enabled=true, source='plan', updated_at=now()
where enabled=false
  and source='override'
  and updated_at=created_at
  and feature_key in (
    'communication_hub','communication_announcements','communication_direct_messages',
    'communication_email_campaigns','communication_templates','communication_segments',
    'communication_scheduling','communication_reports'
  );

insert into public.tenant_feature_entitlements (tenant_id,feature_key,enabled,source)
select tenant.id, feature.key, true, 'plan'
from public.tenants tenant
cross join (values
  ('communication_hub'),('communication_announcements'),('communication_direct_messages'),
  ('communication_email_campaigns'),('communication_templates'),('communication_segments'),
  ('communication_scheduling'),('communication_reports')
) feature(key)
on conflict (tenant_id,feature_key) do nothing;

create table if not exists public.communication_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  status text not null default 'active' check (status in ('active','unsubscribed','archived')),
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,email)
);

alter table public.communication_contacts enable row level security;
create index if not exists idx_communication_contacts_tenant on public.communication_contacts(tenant_id);
drop policy if exists "communication managers read contacts" on public.communication_contacts;
drop policy if exists "communication managers insert contacts" on public.communication_contacts;
drop policy if exists "communication managers update contacts" on public.communication_contacts;
drop policy if exists "communication managers delete contacts" on public.communication_contacts;
create policy "communication managers read contacts" on public.communication_contacts for select using (public.can_manage_communications(tenant_id));
create policy "communication managers insert contacts" on public.communication_contacts for insert with check (public.can_manage_communications(tenant_id));
create policy "communication managers update contacts" on public.communication_contacts for update using (public.can_manage_communications(tenant_id)) with check (public.can_manage_communications(tenant_id));
create policy "communication managers delete contacts" on public.communication_contacts for delete using (public.can_manage_communications(tenant_id));

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  scope text not null check (scope in ('platform','tenant')),
  document_type text not null check (document_type in ('terms','privacy','cookies','acceptable_use','refund')),
  title text not null,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope='platform' and tenant_id is null) or (scope='tenant' and tenant_id is not null))
);

create unique index if not exists idx_legal_documents_platform_type
  on public.legal_documents(document_type) where scope='platform';
create unique index if not exists idx_legal_documents_tenant_type
  on public.legal_documents(tenant_id,document_type) where scope='tenant';

create table if not exists public.legal_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  version text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  effective_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id,version)
);

alter table public.legal_documents drop constraint if exists legal_documents_current_version_id_fkey;
alter table public.legal_documents add constraint legal_documents_current_version_id_fkey
  foreign key (current_version_id) references public.legal_versions(id) on delete set null;

create table if not exists public.tenant_legal_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  business_name text not null default '',
  business_address text not null default '',
  support_email text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_legal_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  accepted_terms_version text not null,
  accepted_privacy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_legal_acceptance_user on public.user_legal_acceptance(user_id,accepted_at desc);

alter table public.legal_documents enable row level security;
alter table public.legal_versions enable row level security;
alter table public.tenant_legal_profiles enable row level security;
alter table public.user_legal_acceptance enable row level security;

drop policy if exists "public reads legal documents" on public.legal_documents;
drop policy if exists "legal administrators manage documents" on public.legal_documents;
create policy "public reads legal documents" on public.legal_documents for select using (
  scope='platform' or public.is_tenant_member(tenant_id) or public.can_administer_tenant(tenant_id)
);
create policy "legal administrators manage documents" on public.legal_documents for all
  using (public.is_platform_admin() or (scope='tenant' and public.can_administer_tenant(tenant_id)))
  with check (public.is_platform_admin() or (scope='tenant' and public.can_administer_tenant(tenant_id)));

drop policy if exists "public reads published legal versions" on public.legal_versions;
drop policy if exists "legal administrators manage versions" on public.legal_versions;
create policy "public reads published legal versions" on public.legal_versions for select using (
  status='published' or exists (
    select 1 from public.legal_documents document
    where document.id=document_id
      and (public.is_platform_admin() or (document.scope='tenant' and public.can_administer_tenant(document.tenant_id)))
  )
);
create policy "legal administrators manage versions" on public.legal_versions for all
  using (exists (
    select 1 from public.legal_documents document where document.id=document_id
      and (public.is_platform_admin() or (document.scope='tenant' and public.can_administer_tenant(document.tenant_id)))
  ))
  with check (exists (
    select 1 from public.legal_documents document where document.id=document_id
      and (public.is_platform_admin() or (document.scope='tenant' and public.can_administer_tenant(document.tenant_id)))
  ));

drop policy if exists "tenant members read legal profile" on public.tenant_legal_profiles;
drop policy if exists "tenant administrators manage legal profile" on public.tenant_legal_profiles;
create policy "tenant members read legal profile" on public.tenant_legal_profiles for select using (public.is_tenant_member(tenant_id));
create policy "tenant administrators manage legal profile" on public.tenant_legal_profiles for all
  using (public.can_administer_tenant(tenant_id)) with check (public.can_administer_tenant(tenant_id));

drop policy if exists "users read own legal acceptance" on public.user_legal_acceptance;
drop policy if exists "users record own legal acceptance" on public.user_legal_acceptance;
create policy "users read own legal acceptance" on public.user_legal_acceptance for select using (user_id=auth.uid() or public.is_platform_admin());
create policy "users record own legal acceptance" on public.user_legal_acceptance for insert with check (user_id=auth.uid());

insert into public.legal_documents (scope,document_type,title)
values
  ('platform','terms','Terms of Service'),
  ('platform','privacy','Privacy Policy'),
  ('platform','cookies','Cookie Policy'),
  ('platform','acceptable_use','Acceptable Use Policy')
on conflict do nothing;
