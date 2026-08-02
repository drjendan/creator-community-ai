-- Milestone 18: stable, reauthorized delivery for private member and paid media.
select pg_advisory_xact_lock(55404, 34);

create table if not exists public.protected_media_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  bucket_id text not null default 'tenant-assets',
  object_path text not null,
  original_name text not null default '',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check(size_bytes>=0),
  folder text not null,
  asset_role text not null default 'content' check(asset_role in ('content','secondary','cover','attachment')),
  content_type text check(content_type is null or content_type in ('episodes','courses','events','resources')),
  content_id uuid,
  access_level text not null default 'member' check(access_level in ('public','member','paid')),
  status text not null default 'pending' check(status in ('pending','active','retired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bucket_id,object_path)
);
create index if not exists idx_protected_media_content on public.protected_media_assets(tenant_id,content_type,content_id,status);
create index if not exists idx_protected_media_pending on public.protected_media_assets(tenant_id,status,created_at);
alter table public.protected_media_assets enable row level security;

create or replace function public.can_manage_protected_media(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public as $$ select
  public.has_tenant_permission(target_tenant,'tenant.content.manage')
  or public.has_tenant_permission(target_tenant,'tenant.podcasts.manage')
  or public.has_tenant_permission(target_tenant,'tenant.courses.manage')
  or public.has_tenant_permission(target_tenant,'tenant.events.manage')
  or public.has_tenant_permission(target_tenant,'tenant.resources.manage')
  or public.has_tenant_permission(target_tenant,'tenant.settings.manage')
$$;
drop policy if exists "media managers read registry" on public.protected_media_assets;
create policy "media managers read registry" on public.protected_media_assets for select using(public.can_manage_protected_media(tenant_id));
drop policy if exists "media managers manage registry" on public.protected_media_assets;
create policy "media managers manage registry" on public.protected_media_assets for all using(public.can_manage_protected_media(tenant_id)) with check(public.can_manage_protected_media(tenant_id));

-- Direct object reads are management-only. Member delivery is reauthorized by /api/media/[id].
drop policy if exists "tenant scoped storage read" on storage.objects;
drop policy if exists "tenant scoped storage write" on storage.objects;
drop policy if exists "tenant scoped storage update" on storage.objects;
drop policy if exists "tenant scoped storage delete" on storage.objects;
drop policy if exists "protected media managers read" on storage.objects;
drop policy if exists "protected media managers insert" on storage.objects;
drop policy if exists "protected media managers update" on storage.objects;
drop policy if exists "protected media managers delete" on storage.objects;
create policy "protected media managers read" on storage.objects for select using(bucket_id='tenant-assets' and public.can_manage_protected_media(((storage.foldername(name))[1])::uuid));
create policy "protected media managers insert" on storage.objects for insert with check(bucket_id='tenant-assets' and public.can_manage_protected_media(((storage.foldername(name))[1])::uuid));
create policy "protected media managers update" on storage.objects for update using(bucket_id='tenant-assets' and public.can_manage_protected_media(((storage.foldername(name))[1])::uuid)) with check(bucket_id='tenant-assets' and public.can_manage_protected_media(((storage.foldername(name))[1])::uuid));
create policy "protected media managers delete" on storage.objects for delete using(bucket_id='tenant-assets' and public.can_manage_protected_media(((storage.foldername(name))[1])::uuid));

create or replace function public.validate_protected_media_asset()
returns trigger language plpgsql security definer set search_path=public,storage as $$
begin
  if new.bucket_id<>'tenant-assets' or split_part(new.object_path,'/',1)<>new.tenant_id::text then raise exception 'invalid_protected_media_path'; end if;
  if new.content_id is not null then
    if new.content_type='episodes' and not exists(select 1 from public.episodes where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_media_content';
    elsif new.content_type='courses' and not exists(select 1 from public.courses where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_media_content';
    elsif new.content_type='events' and not exists(select 1 from public.events where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_media_content';
    elsif new.content_type='resources' and not exists(select 1 from public.resources where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_media_content'; end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_protected_media_relationship on public.protected_media_assets;
create trigger validate_protected_media_relationship before insert or update on public.protected_media_assets for each row execute function public.validate_protected_media_asset();

-- Backfill tenant-assets URLs issued by the legacy seven-day signing flow.
insert into public.protected_media_assets(tenant_id,object_path,folder,asset_role,content_type,content_id,access_level,status)
select distinct on (tenant_id,object_path) tenant_id,object_path,folder,asset_role,content_type,content_id,access_level,'active'
from (select tenant_id,split_part(split_part(media_url,'/tenant-assets/',2),'?',1) object_path,split_part(split_part(split_part(media_url,'/tenant-assets/',2),'?',1),'/',2) folder,asset_role,content_type,content_id,access_level
from (
  select tenant_id,audio_url media_url,'content' asset_role,'episodes' content_type,id content_id,access_level from public.episodes union all
  select tenant_id,video_url,'secondary','episodes',id,access_level from public.episodes union all
  select tenant_id,cover_image_url,'cover','episodes',id,access_level from public.episodes union all
  select tenant_id,content_url,'content','courses',id,access_level from public.courses union all
  select tenant_id,cover_image_url,'cover','courses',id,access_level from public.courses union all
  select tenant_id,location_url,'content','events',id,access_level from public.events union all
  select tenant_id,cover_image_url,'cover','events',id,access_level from public.events union all
  select tenant_id,url,'content','resources',id,access_level from public.resources union all
  select tenant_id,cover_image_url,'cover','resources',id,access_level from public.resources
) legacy where media_url like '%/tenant-assets/%') candidates
order by tenant_id,object_path,content_type,content_id,asset_role
on conflict(bucket_id,object_path) do update set content_type=excluded.content_type,content_id=excluded.content_id,access_level=excluded.access_level,status='active',updated_at=now();

update public.episodes item set audio_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='episodes' and asset.content_id=item.id and asset.asset_role='content' and item.audio_url like '%/tenant-assets/%';
update public.episodes item set video_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='episodes' and asset.content_id=item.id and asset.asset_role='secondary' and item.video_url like '%/tenant-assets/%';
update public.episodes item set cover_image_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='episodes' and asset.content_id=item.id and asset.asset_role='cover' and item.cover_image_url like '%/tenant-assets/%';
update public.courses item set content_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='courses' and asset.content_id=item.id and asset.asset_role='content' and item.content_url like '%/tenant-assets/%';
update public.courses item set cover_image_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='courses' and asset.content_id=item.id and asset.asset_role='cover' and item.cover_image_url like '%/tenant-assets/%';
update public.events item set location_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='events' and asset.content_id=item.id and asset.asset_role='content' and item.location_url like '%/tenant-assets/%';
update public.events item set cover_image_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='events' and asset.content_id=item.id and asset.asset_role='cover' and item.cover_image_url like '%/tenant-assets/%';
update public.resources item set url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='resources' and asset.content_id=item.id and asset.asset_role='content' and item.url like '%/tenant-assets/%';
update public.resources item set cover_image_url='/api/media/'||asset.id from public.protected_media_assets asset where asset.content_type='resources' and asset.content_id=item.id and asset.asset_role='cover' and item.cover_image_url like '%/tenant-assets/%';
