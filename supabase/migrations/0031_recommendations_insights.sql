-- Milestone 15: explainable member recommendations and human-reviewed administrator insights.
-- Serialize concurrent executions before any permission rows or table locks are acquired.
select pg_advisory_xact_lock(55404, 31);

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.insights.manage','Review administrator insights')
on conflict (permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_owner','tenant.insights.manage'),
  ('tenant_admin','tenant.insights.manage'),
  ('analyst','tenant.insights.manage')
on conflict do nothing;

alter table public.member_recommendations
  add column if not exists content_type text,
  add column if not exists explanation text not null default '',
  add column if not exists rank integer not null default 0,
  add column if not exists source text not null default 'rules',
  add column if not exists feedback text,
  add column if not exists dismissed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
alter table public.member_recommendations drop constraint if exists member_recommendations_content_type_check;
alter table public.member_recommendations add constraint member_recommendations_content_type_check check(content_type is null or content_type in ('episode','course','event','resource','community_space'));
alter table public.member_recommendations drop constraint if exists member_recommendations_status_check;
alter table public.member_recommendations add constraint member_recommendations_status_check check(status in ('active','dismissed','completed','expired'));
alter table public.member_recommendations drop constraint if exists member_recommendations_feedback_check;
alter table public.member_recommendations add constraint member_recommendations_feedback_check check(feedback is null or feedback in ('helpful','not_helpful'));

alter table public.administrator_ai_insights
  add column if not exists insight_key text,
  add column if not exists severity text not null default 'info',
  add column if not exists recommended_action text not null default '',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists dismissed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
alter table public.administrator_ai_insights drop constraint if exists administrator_ai_insights_severity_check;
alter table public.administrator_ai_insights add constraint administrator_ai_insights_severity_check check(severity in ('info','opportunity','attention'));
alter table public.administrator_ai_insights drop constraint if exists administrator_ai_insights_status_check;
alter table public.administrator_ai_insights add constraint administrator_ai_insights_status_check check(status in ('active','reviewed','dismissed','expired'));

create unique index if not exists uq_member_recommendation_content on public.member_recommendations(tenant_id,user_id,content_type,content_id) where content_type is not null and content_id is not null;
create unique index if not exists uq_administrator_insight_key on public.administrator_ai_insights(tenant_id,insight_key) where insight_key is not null;
create index if not exists idx_member_recommendations_feed on public.member_recommendations(tenant_id,user_id,status,rank,score desc);
create index if not exists idx_administrator_insights_review on public.administrator_ai_insights(tenant_id,status,severity,updated_at desc);

drop policy if exists "owners read ai insights" on public.administrator_ai_insights;
drop policy if exists "tenant members read" on public.administrator_ai_insights;
drop policy if exists "tenant managers insert" on public.administrator_ai_insights;
drop policy if exists "tenant managers update" on public.administrator_ai_insights;
drop policy if exists "tenant managers delete" on public.administrator_ai_insights;
create policy "authorized users read administrator insights" on public.administrator_ai_insights for select using(public.has_tenant_permission(tenant_id,'tenant.analytics.view'));
drop policy if exists "insight reviewers update administrator insights" on public.administrator_ai_insights;
create policy "insight reviewers update administrator insights" on public.administrator_ai_insights for update using(public.has_tenant_permission(tenant_id,'tenant.insights.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.insights.manage'));

drop policy if exists "members read own recommendations" on public.member_recommendations;
drop policy if exists "tenant managers insert" on public.member_recommendations;
drop policy if exists "tenant managers update" on public.member_recommendations;
drop policy if exists "tenant managers delete" on public.member_recommendations;
create policy "members read own recommendations" on public.member_recommendations for select using(user_id=auth.uid());
drop policy if exists "members update own recommendations" on public.member_recommendations;
create policy "members update own recommendations" on public.member_recommendations for update using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.validate_member_recommendation_target()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.content_id is null or new.content_type is null then return new; end if;
  if new.content_type='episode' and not exists(select 1 from public.episodes where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_recommendation_target';
  elsif new.content_type='course' and not exists(select 1 from public.courses where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_recommendation_target';
  elsif new.content_type='event' and not exists(select 1 from public.events where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_recommendation_target';
  elsif new.content_type='resource' and not exists(select 1 from public.resources where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_recommendation_target';
  elsif new.content_type='community_space' and not exists(select 1 from public.community_spaces where id=new.content_id and tenant_id=new.tenant_id) then raise exception 'invalid_recommendation_target';
  end if;
  return new;
end $$;
drop trigger if exists validate_member_recommendation_target on public.member_recommendations;
create trigger validate_member_recommendation_target before insert or update on public.member_recommendations for each row execute function public.validate_member_recommendation_target();
