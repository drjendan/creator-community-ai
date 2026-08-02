-- Milestone 9: tenant-grounded member AI Coach.

alter table public.tenant_ai_settings
  add column if not exists coach_name text not null default 'AI Coach',
  add column if not exists welcome_message text not null default 'How can I support your learning today?',
  add column if not exists disclaimer_text text not null default 'This AI provides educational guidance based on this organization''s content. It is not medical, legal, mental-health, pastoral, or emergency advice.',
  add column if not exists crisis_message text not null default 'If you or someone else may be in immediate danger, contact local emergency services or a qualified crisis service now.',
  add column if not exists tone text not null default 'warm, practical, and respectful',
  add column if not exists citations_required boolean not null default true,
  add column if not exists retain_message_content boolean not null default false,
  add column if not exists max_requests_per_hour integer not null default 20;
alter table public.tenant_ai_settings drop constraint if exists tenant_ai_settings_coach_rate_check;
alter table public.tenant_ai_settings add constraint tenant_ai_settings_coach_rate_check check (max_requests_per_hour between 1 and 200);

alter table public.ai_knowledge_sources
  add column if not exists source_title text,
  add column if not exists search_text text,
  add column if not exists source_url text,
  add column if not exists access_content_type text,
  add column if not exists access_content_id uuid,
  add column if not exists access_level text not null default 'member',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;
update public.ai_knowledge_sources set source_title=coalesce(source_title,source_type||' source'),search_text=coalesce(search_text,'') where source_title is null or search_text is null;
alter table public.ai_knowledge_sources alter column source_title set not null;
alter table public.ai_knowledge_sources alter column search_text set not null;
alter table public.ai_knowledge_sources drop constraint if exists ai_knowledge_sources_status_check;
alter table public.ai_knowledge_sources add constraint ai_knowledge_sources_status_check check (status in ('pending','approved','excluded'));
alter table public.ai_knowledge_sources drop constraint if exists ai_knowledge_sources_access_level_check;
alter table public.ai_knowledge_sources add constraint ai_knowledge_sources_access_level_check check (access_level in ('public','member','paid'));
alter table public.ai_knowledge_sources drop constraint if exists ai_knowledge_sources_access_type_check;
alter table public.ai_knowledge_sources add constraint ai_knowledge_sources_access_type_check check (access_content_type is null or access_content_type in ('episode','course','lesson','resource'));
create unique index if not exists uq_ai_knowledge_source_identity on public.ai_knowledge_sources(tenant_id,source_type,source_id);
create index if not exists idx_ai_knowledge_sources_search on public.ai_knowledge_sources using gin(to_tsvector('english',coalesce(source_title,'')||' '||coalesce(search_text,''))) where status='approved';

alter table public.ai_conversations
  add column if not exists message_count integer not null default 0,
  add column if not exists last_message_at timestamptz,
  add column if not exists disclaimer_accepted_at timestamptz;
alter table public.ai_messages
  add column if not exists content_sha256 text,
  add column if not exists content_retained boolean not null default false;

create table if not exists public.ai_coach_request_limits (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key(tenant_id,user_id,window_start)
);
alter table public.ai_coach_request_limits enable row level security;
revoke all on table public.ai_coach_request_limits from anon,authenticated;

drop policy if exists "tenant members read" on public.ai_knowledge_sources;
drop policy if exists "tenant managers insert" on public.ai_knowledge_sources;
drop policy if exists "tenant managers update" on public.ai_knowledge_sources;
drop policy if exists "tenant managers delete" on public.ai_knowledge_sources;
create policy "AI managers read sources" on public.ai_knowledge_sources for select using (public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "AI managers insert sources" on public.ai_knowledge_sources for insert with check (public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "AI managers update sources" on public.ai_knowledge_sources for update using (public.has_tenant_permission(tenant_id,'tenant.settings.manage')) with check (public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "AI managers delete sources" on public.ai_knowledge_sources for delete using (public.has_tenant_permission(tenant_id,'tenant.settings.manage'));

drop policy if exists "tenant members read" on public.ai_conversations;
create policy "members read own AI conversations" on public.ai_conversations for select using (user_id=auth.uid() or public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
drop policy if exists "tenant members read" on public.ai_messages;
create policy "members read own AI messages" on public.ai_messages for select using (
  exists(select 1 from public.ai_conversations conversation where conversation.id=conversation_id and conversation.tenant_id=ai_messages.tenant_id and conversation.user_id=auth.uid())
  or public.has_tenant_permission(tenant_id,'tenant.settings.manage')
);

create or replace function public.search_ai_coach_sources(target_tenant uuid,search_query text,max_results integer default 5)
returns table(source_id uuid,source_type text,content_id uuid,title text,source_url text,excerpt text,relevance real)
language plpgsql stable security definer set search_path=public as $$
begin
  if coalesce(auth.role(),'')<>'service_role' and not public.is_tenant_member(target_tenant) then raise exception 'tenant_membership_required'; end if;
  return query
    select source.id,source.source_type,source.source_id,source.source_title,source.source_url,
      left(source.search_text,1200),
      ts_rank(to_tsvector('english',source.source_title||' '||source.search_text),plainto_tsquery('english',left(search_query,500)))
    from public.ai_knowledge_sources source
    where source.tenant_id=target_tenant and source.status='approved'
      and public.has_content_access(target_tenant,coalesce(source.access_content_type,source.source_type),coalesce(source.access_content_id,source.source_id),source.access_level)
      and to_tsvector('english',source.source_title||' '||source.search_text) @@ plainto_tsquery('english',left(search_query,500))
    order by 7 desc,source.updated_at desc
    limit least(greatest(max_results,1),8);
end $$;
revoke all on function public.search_ai_coach_sources(uuid,text,integer) from public,anon;
grant execute on function public.search_ai_coach_sources(uuid,text,integer) to authenticated,service_role;

create or replace function public.reserve_ai_coach_request(target_tenant uuid,target_user uuid,max_requests integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare target_window timestamptz:=date_trunc('hour',now()); reserved boolean;
begin
  if coalesce(auth.role(),'')<>'service_role' and (auth.uid()<>target_user or not public.is_tenant_member(target_tenant)) then raise exception 'tenant_membership_required'; end if;
  insert into public.ai_coach_request_limits(tenant_id,user_id,window_start,request_count)
  values(target_tenant,target_user,target_window,1)
  on conflict(tenant_id,user_id,window_start) do update set request_count=public.ai_coach_request_limits.request_count+1
    where public.ai_coach_request_limits.request_count<least(greatest(max_requests,1),200)
  returning true into reserved;
  delete from public.ai_coach_request_limits where window_start<now()-interval '48 hours';
  return coalesce(reserved,false);
end $$;
revoke all on function public.reserve_ai_coach_request(uuid,uuid,integer) from public,anon;
grant execute on function public.reserve_ai_coach_request(uuid,uuid,integer) to authenticated,service_role;
