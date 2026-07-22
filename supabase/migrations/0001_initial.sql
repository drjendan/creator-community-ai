create extension if not exists pgcrypto;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','content_manager','member')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  logo_url text,
  primary_color text default '#2d2119',
  secondary_color text default '#7b5d45',
  accent_color text default '#d6b98c',
  background_color text default '#f8f6f1',
  hero_image_url text,
  footer_text text,
  updated_at timestamptz not null default now()
);

create table public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  audio_url text,
  video_url text,
  transcript text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_branding enable row level security;
alter table public.podcast_episodes enable row level security;

create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id = target_tenant and tm.user_id = auth.uid()
  );
$$;

create policy "members can read tenant" on public.tenants
for select using (public.is_tenant_member(id));

create policy "users read own profile" on public.profiles
for select using (id = auth.uid());

create policy "users update own profile" on public.profiles
for update using (id = auth.uid());

create policy "members read memberships" on public.tenant_memberships
for select using (user_id = auth.uid() or public.is_tenant_member(tenant_id));

create policy "members read branding" on public.tenant_branding
for select using (public.is_tenant_member(tenant_id));

create policy "members read published episodes" on public.podcast_episodes
for select using (public.is_tenant_member(tenant_id) and status = 'published');
