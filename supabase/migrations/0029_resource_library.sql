-- Milestone 13: complete resource metadata, versioning, bookmarks, and access controls.

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.resources.manage','Manage resources')
on conflict (permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_owner','tenant.resources.manage'),
  ('tenant_admin','tenant.resources.manage'),
  ('content_manager','tenant.resources.manage')
on conflict do nothing;

alter table public.resources
  add column if not exists full_description text not null default '',
  add column if not exists author text not null default '',
  add column if not exists file_format text not null default '',
  add column if not exists file_size_bytes bigint,
  add column if not exists version_label text not null default '1.0',
  add column if not exists allow_download boolean not null default true,
  add column if not exists featured boolean not null default false,
  add column if not exists publish_date timestamptz;
alter table public.resources drop constraint if exists resources_file_size_check;
alter table public.resources add constraint resources_file_size_check check(file_size_bytes is null or file_size_bytes>=0);
alter table public.resources drop constraint if exists resources_type_check;
alter table public.resources add constraint resources_type_check check(resource_type in ('file','guide','worksheet','template','checklist','ebook','article','tool','video','audio','link','pdf','document','presentation','spreadsheet','graphic','recording','transcript','download'));

create table if not exists public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  version_label text not null,
  notes text not null default '',
  url text not null,
  file_format text not null default '',
  file_size_bytes bigint,
  allow_download boolean not null default true,
  status text not null default 'published' check(status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_id,version_label),
  check(file_size_bytes is null or file_size_bytes>=0)
);

create table if not exists public.resource_bookmarks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(resource_id,user_id)
);

create index if not exists idx_resources_library on public.resources(tenant_id,status,featured,publish_date);
create index if not exists idx_resource_versions_resource on public.resource_versions(tenant_id,resource_id,created_at desc);
create index if not exists idx_resource_bookmarks_user on public.resource_bookmarks(tenant_id,user_id,created_at desc);
alter table public.resource_versions enable row level security;
alter table public.resource_bookmarks enable row level security;

create or replace function public.can_manage_resource_content(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_platform_admin() or public.has_tenant_permission(target_tenant,'tenant.resources.manage') $$;

drop policy if exists "resource managers read" on public.resources;
create policy "resource managers read" on public.resources for select using(public.can_manage_resource_content(tenant_id));
drop policy if exists "resource managers insert" on public.resources;
create policy "resource managers insert" on public.resources for insert with check(public.can_manage_resource_content(tenant_id));
drop policy if exists "resource managers update" on public.resources;
create policy "resource managers update" on public.resources for update using(public.can_manage_resource_content(tenant_id)) with check(public.can_manage_resource_content(tenant_id));
drop policy if exists "resource managers delete" on public.resources;
create policy "resource managers delete" on public.resources for delete using(public.can_manage_resource_content(tenant_id));

drop policy if exists "members read accessible resource versions" on public.resource_versions;
create policy "members read accessible resource versions" on public.resource_versions for select using(
  (status='published' and exists(
    select 1 from public.resources resource where resource.id=resource_versions.resource_id
      and resource.tenant_id=resource_versions.tenant_id and resource.status='published'
      and (resource.publish_date is null or resource.publish_date<=now())
      and public.has_content_access(resource_versions.tenant_id,'resource',resource.id,resource.access_level)
  )) or public.can_manage_resource_content(tenant_id)
);
drop policy if exists "resource managers insert versions" on public.resource_versions;
create policy "resource managers insert versions" on public.resource_versions for insert with check(public.can_manage_resource_content(tenant_id));
drop policy if exists "resource managers update versions" on public.resource_versions;
create policy "resource managers update versions" on public.resource_versions for update using(public.can_manage_resource_content(tenant_id)) with check(public.can_manage_resource_content(tenant_id));
drop policy if exists "resource managers delete versions" on public.resource_versions;
create policy "resource managers delete versions" on public.resource_versions for delete using(public.can_manage_resource_content(tenant_id));

drop policy if exists "members read own resource bookmarks" on public.resource_bookmarks;
create policy "members read own resource bookmarks" on public.resource_bookmarks for select using(user_id=auth.uid());
drop policy if exists "members add own resource bookmarks" on public.resource_bookmarks;
create policy "members add own resource bookmarks" on public.resource_bookmarks for insert with check(
  user_id=auth.uid() and public.is_tenant_member(tenant_id) and exists(
    select 1 from public.resources resource where resource.id=resource_bookmarks.resource_id
      and resource.tenant_id=resource_bookmarks.tenant_id and resource.status='published'
      and (resource.publish_date is null or resource.publish_date<=now())
      and public.has_content_access(resource_bookmarks.tenant_id,'resource',resource.id,resource.access_level)
  )
);
drop policy if exists "members remove own resource bookmarks" on public.resource_bookmarks;
create policy "members remove own resource bookmarks" on public.resource_bookmarks for delete using(user_id=auth.uid());

create or replace function public.validate_resource_support_relationships()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.resources where id=new.resource_id and tenant_id=new.tenant_id) then raise exception 'invalid_resource_relationship'; end if;
  return new;
end $$;
drop trigger if exists validate_resource_version_relationship on public.resource_versions;
create trigger validate_resource_version_relationship before insert or update on public.resource_versions for each row execute function public.validate_resource_support_relationships();
drop trigger if exists validate_resource_bookmark_relationship on public.resource_bookmarks;
create trigger validate_resource_bookmark_relationship before insert or update on public.resource_bookmarks for each row execute function public.validate_resource_support_relationships();

drop policy if exists "authorized published resources" on public.resources;
create policy "authorized published resources" on public.resources for select using(
  status='published' and (publish_date is null or publish_date<=now())
  and public.has_content_access(tenant_id,'resource',id,access_level)
);
