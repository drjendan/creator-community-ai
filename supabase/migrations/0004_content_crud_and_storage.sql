-- Complete tenant content CRUD and managed uploads.

alter table public.episodes add column if not exists video_url text;
alter table public.episodes add column if not exists cover_image_url text;
alter table public.courses add column if not exists cover_image_url text;
alter table public.events add column if not exists location_url text;
alter table public.events add column if not exists cover_image_url text;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  resource_type text not null default 'file',
  url text not null,
  status text not null default 'draft',
  access_level text not null default 'member' check (access_level in ('public','member','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists idx_resources_tenant_id on public.resources(tenant_id);
alter table public.resources enable row level security;

drop policy if exists "tenant members read" on public.resources;
drop policy if exists "tenant managers insert" on public.resources;
drop policy if exists "tenant managers update" on public.resources;
drop policy if exists "tenant managers delete" on public.resources;

create policy "tenant members read" on public.resources
  for select using (public.is_platform_admin() or public.is_tenant_member(tenant_id));
create policy "tenant managers insert" on public.resources
  for insert with check (public.can_manage_tenant(tenant_id));
create policy "tenant managers update" on public.resources
  for update using (public.can_manage_tenant(tenant_id))
  with check (public.can_manage_tenant(tenant_id));
create policy "tenant managers delete" on public.resources
  for delete using (public.can_manage_tenant(tenant_id));

insert into storage.buckets (id, name, public, file_size_limit)
values ('tenant-assets', 'tenant-assets', false, 104857600)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "tenant scoped storage update" on storage.objects;
drop policy if exists "tenant scoped storage delete" on storage.objects;

create policy "tenant scoped storage update" on storage.objects
  for update using (
    bucket_id = 'tenant-assets'
    and public.can_manage_tenant(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'tenant-assets'
    and public.can_manage_tenant(((storage.foldername(name))[1])::uuid)
  );

create policy "tenant scoped storage delete" on storage.objects
  for delete using (
    bucket_id = 'tenant-assets'
    and public.can_manage_tenant(((storage.foldername(name))[1])::uuid)
  );

