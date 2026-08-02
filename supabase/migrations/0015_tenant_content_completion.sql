-- Complete tenant content administration and repair legacy core entitlements.

insert into public.tenant_feature_entitlements (tenant_id, feature_key, enabled, source)
select tenant.id, feature.key, true, 'plan'
from public.tenants tenant
cross join (values ('podcasts'), ('courses'), ('resources'), ('events')) feature(key)
on conflict (tenant_id, feature_key) do nothing;

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  content_type text not null default 'all'
    check (content_type in ('all','podcasts','courses','resources','events')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists public.tenant_content_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  default_access_level text not null default 'member'
    check (default_access_level in ('public','member','paid')),
  require_publish_date boolean not null default false,
  allow_downloads boolean not null default true,
  show_draft_badges boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.courses add column if not exists instructor text;

alter table public.content_categories enable row level security;
alter table public.tenant_content_settings enable row level security;

drop policy if exists "tenant content managers read categories" on public.content_categories;
drop policy if exists "tenant content managers insert categories" on public.content_categories;
drop policy if exists "tenant content managers update categories" on public.content_categories;
drop policy if exists "tenant content managers delete categories" on public.content_categories;
create policy "tenant content managers read categories" on public.content_categories
  for select using (public.can_manage_tenant(tenant_id));
create policy "tenant content managers insert categories" on public.content_categories
  for insert with check (public.can_manage_tenant(tenant_id));
create policy "tenant content managers update categories" on public.content_categories
  for update using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));
create policy "tenant content managers delete categories" on public.content_categories
  for delete using (public.can_manage_tenant(tenant_id));

drop policy if exists "tenant content managers read settings" on public.tenant_content_settings;
drop policy if exists "tenant content managers insert settings" on public.tenant_content_settings;
drop policy if exists "tenant content managers update settings" on public.tenant_content_settings;
create policy "tenant content managers read settings" on public.tenant_content_settings
  for select using (public.can_manage_tenant(tenant_id));
create policy "tenant content managers insert settings" on public.tenant_content_settings
  for insert with check (public.can_manage_tenant(tenant_id));
create policy "tenant content managers update settings" on public.tenant_content_settings
  for update using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id));

-- Specialized roles were introduced after the original generic RLS helper.
-- Add narrowly-scoped mutation policies instead of broadening their access to
-- unrelated tenant administration tables.
create or replace function public.can_manage_course_content(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_platform_admin() or exists (
  select 1 from public.tenant_memberships membership
  where membership.tenant_id=target_tenant and membership.user_id=auth.uid()
    and membership.status='active'
    and membership.role in ('tenant_owner','tenant_admin','content_manager','course_manager')
) $$;

create or replace function public.can_manage_event_content(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_platform_admin() or exists (
  select 1 from public.tenant_memberships membership
  where membership.tenant_id=target_tenant and membership.user_id=auth.uid()
    and membership.status='active'
    and membership.role in ('tenant_owner','tenant_admin','content_manager','event_manager')
) $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['courses','course_modules','lessons','lesson_resources'] loop
    execute format('drop policy if exists "course managers read" on public.%I', table_name);
    execute format('drop policy if exists "course managers insert" on public.%I', table_name);
    execute format('drop policy if exists "course managers update" on public.%I', table_name);
    execute format('drop policy if exists "course managers delete" on public.%I', table_name);
    execute format('create policy "course managers read" on public.%I for select using (public.can_manage_course_content(tenant_id))', table_name);
    execute format('create policy "course managers insert" on public.%I for insert with check (public.can_manage_course_content(tenant_id))', table_name);
    execute format('create policy "course managers update" on public.%I for update using (public.can_manage_course_content(tenant_id)) with check (public.can_manage_course_content(tenant_id))', table_name);
    execute format('create policy "course managers delete" on public.%I for delete using (public.can_manage_course_content(tenant_id))', table_name);
  end loop;
end $$;

drop policy if exists "event managers read" on public.events;
drop policy if exists "event managers insert" on public.events;
drop policy if exists "event managers update" on public.events;
drop policy if exists "event managers delete" on public.events;
create policy "event managers read" on public.events for select using (public.can_manage_event_content(tenant_id));
create policy "event managers insert" on public.events for insert with check (public.can_manage_event_content(tenant_id));
create policy "event managers update" on public.events for update using (public.can_manage_event_content(tenant_id)) with check (public.can_manage_event_content(tenant_id));
create policy "event managers delete" on public.events for delete using (public.can_manage_event_content(tenant_id));
