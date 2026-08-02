-- Milestone 11: complete podcast authoring and member learning experience.

alter table public.episodes
  add column if not exists show_notes text not null default '',
  add column if not exists key_takeaways jsonb not null default '[]',
  add column if not exists reflection_questions jsonb not null default '[]',
  add column if not exists duration_seconds integer,
  add column if not exists season_number integer,
  add column if not exists episode_number integer,
  add column if not exists featured boolean not null default false;
alter table public.episodes drop constraint if exists episodes_duration_check;
alter table public.episodes add constraint episodes_duration_check check(duration_seconds is null or duration_seconds between 1 and 86400);
alter table public.episodes drop constraint if exists episodes_number_check;
alter table public.episodes add constraint episodes_number_check check((season_number is null or season_number>0) and (episode_number is null or episode_number>0));
alter table public.episodes drop constraint if exists episodes_learning_arrays_check;
alter table public.episodes add constraint episodes_learning_arrays_check check(jsonb_typeof(key_takeaways)='array' and jsonb_typeof(reflection_questions)='array');

alter table public.episode_transcripts
  add column if not exists language text not null default 'en',
  add column if not exists allow_download boolean not null default false;
alter table public.episode_resources
  add column if not exists description text not null default '',
  add column if not exists resource_type text not null default 'link',
  add column if not exists allow_download boolean not null default true,
  add column if not exists sort_order integer not null default 0;
alter table public.episode_resources drop constraint if exists episode_resources_type_check;
alter table public.episode_resources add constraint episode_resources_type_check check(resource_type in ('link','download','worksheet','transcript','book','article','video','audio'));
create index if not exists idx_episode_resources_order on public.episode_resources(tenant_id,episode_id,sort_order);
create index if not exists idx_episode_tags_tag on public.episode_tags(tenant_id,tag);
create index if not exists idx_episodes_featured on public.episodes(tenant_id,featured,publish_date) where status='published';

-- Supporting rows must inherit the parent episode's publication and access.
drop policy if exists "tenant members read" on public.episode_transcripts;
create policy "members read accessible transcripts" on public.episode_transcripts for select using(
  exists(select 1 from public.episodes episode where episode.id=episode_transcripts.episode_id and episode.tenant_id=episode_transcripts.tenant_id and episode.status='published' and (episode.publish_date is null or episode.publish_date<=now()) and public.has_content_access(episode_transcripts.tenant_id,'episode',episode.id,episode.access_level))
  or public.has_tenant_permission(tenant_id,'tenant.podcasts.manage')
);
drop policy if exists "tenant members read" on public.episode_resources;
create policy "members read accessible episode resources" on public.episode_resources for select using(
  exists(select 1 from public.episodes episode where episode.id=episode_resources.episode_id and episode.tenant_id=episode_resources.tenant_id and episode.status='published' and (episode.publish_date is null or episode.publish_date<=now()) and public.has_content_access(episode_resources.tenant_id,'episode',episode.id,episode.access_level))
  or public.has_tenant_permission(tenant_id,'tenant.podcasts.manage')
);
drop policy if exists "tenant members read" on public.episode_tags;
create policy "members read accessible episode tags" on public.episode_tags for select using(
  exists(select 1 from public.episodes episode where episode.id=episode_tags.episode_id and episode.tenant_id=episode_tags.tenant_id and episode.status='published' and (episode.publish_date is null or episode.publish_date<=now()) and public.has_content_access(episode_tags.tenant_id,'episode',episode.id,episode.access_level))
  or public.has_tenant_permission(tenant_id,'tenant.podcasts.manage')
);

create or replace function public.validate_episode_support_relationships()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.episodes where id=new.episode_id and tenant_id=new.tenant_id) then raise exception 'invalid_episode_relationship'; end if;
  return new;
end $$;
drop trigger if exists validate_episode_transcript_relationship on public.episode_transcripts;
create trigger validate_episode_transcript_relationship before insert or update on public.episode_transcripts for each row execute function public.validate_episode_support_relationships();
drop trigger if exists validate_episode_resource_relationship on public.episode_resources;
create trigger validate_episode_resource_relationship before insert or update on public.episode_resources for each row execute function public.validate_episode_support_relationships();
drop trigger if exists validate_episode_tag_relationship on public.episode_tags;
create trigger validate_episode_tag_relationship before insert or update on public.episode_tags for each row execute function public.validate_episode_support_relationships();
