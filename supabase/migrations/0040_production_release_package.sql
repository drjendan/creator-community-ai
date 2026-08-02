-- Milestone 24: immutable production release candidates, approval, and deployment evidence.
select pg_advisory_xact_lock(55404, 40);

insert into public.platform_permissions(permission_key,label) values
  ('platform.release.manage','Create and manage production release candidates'),
  ('platform.release.approve','Approve and record production releases')
on conflict(permission_key) do update set label=excluded.label;
insert into public.platform_role_permissions(role_key,permission_key) values
  ('platform_owner','platform.release.manage'),('platform_owner','platform.release.approve'),
  ('platform_admin','platform.release.manage')
on conflict do nothing;

create table if not exists public.production_release_candidates (
  id uuid primary key default gen_random_uuid(),
  release_reference text not null check(char_length(btrim(release_reference)) between 1 and 500),
  application_version text not null check(char_length(btrim(application_version)) between 1 and 200),
  commit_sha text not null check(commit_sha ~ '^[0-9a-f]{40}$'),
  artifact_sha256 text not null check(artifact_sha256 ~ '^[0-9a-f]{64}$'),
  migration_from integer not null default 1 check(migration_from=1),
  migration_through integer not null default 40 check(migration_through=40),
  status text not null default 'awaiting_approval' check(status in ('awaiting_approval','approved','released','canceled')),
  readiness_snapshot jsonb not null,
  rls_run_id uuid not null references public.rls_verification_runs(id) on delete restrict,
  quality_run_id uuid not null references public.quality_verification_runs(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  released_by uuid references auth.users(id) on delete restrict,
  released_at timestamptz,
  deployment_evidence_reference text not null default '' check(char_length(deployment_evidence_reference)<=1000),
  check((status='awaiting_approval' and approved_by is null and approved_at is null and released_by is null and released_at is null) or (status='approved' and approved_by is not null and approved_at is not null and released_by is null and released_at is null) or (status='released' and approved_by is not null and approved_at is not null and released_by is not null and released_at is not null and char_length(btrim(deployment_evidence_reference))>0) or status='canceled')
);
create index if not exists idx_production_release_candidates_status on public.production_release_candidates(status,created_at desc);
create unique index if not exists uq_non_canceled_production_release_reference on public.production_release_candidates(release_reference) where status<>'canceled';
alter table public.production_release_candidates enable row level security;

create table if not exists public.production_release_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.production_release_candidates(id) on delete restrict,
  event_type text not null check(event_type in ('candidate_created','approved','deployment_recorded','canceled')),
  evidence_reference text not null default '' check(char_length(evidence_reference)<=1000),
  notes text not null default '' check(char_length(notes)<=5000),
  performed_by uuid not null references auth.users(id) on delete restrict,
  performed_at timestamptz not null default now(),
  check(event_type not in ('approved','deployment_recorded') or char_length(btrim(evidence_reference))>0)
);
create index if not exists idx_production_release_events_history on public.production_release_events(release_id,performed_at);
alter table public.production_release_events enable row level security;

create or replace function public.validate_production_release_candidate_update()
returns trigger language plpgsql set search_path=public as $$
begin
  if row(new.release_reference,new.application_version,new.commit_sha,new.artifact_sha256,new.migration_from,new.migration_through,new.readiness_snapshot,new.rls_run_id,new.quality_run_id,new.created_by,new.created_at)
     is distinct from row(old.release_reference,old.application_version,old.commit_sha,old.artifact_sha256,old.migration_from,old.migration_through,old.readiness_snapshot,old.rls_run_id,old.quality_run_id,old.created_by,old.created_at) then raise exception 'immutable_release_candidate'; end if;
  if not ((old.status='awaiting_approval' and new.status in ('approved','canceled')) or (old.status='approved' and new.status in ('released','canceled'))) then raise exception 'invalid_release_status_transition'; end if;
  return new;
end $$;
drop trigger if exists validate_production_release_candidate_update on public.production_release_candidates;
create trigger validate_production_release_candidate_update before update on public.production_release_candidates for each row execute function public.validate_production_release_candidate_update();

create or replace function public.prevent_production_release_event_mutation()
returns trigger language plpgsql set search_path=public as $$ begin raise exception 'production_release_events_are_append_only'; end $$;
drop trigger if exists prevent_production_release_event_mutation on public.production_release_events;
create trigger prevent_production_release_event_mutation before update or delete on public.production_release_events for each row execute function public.prevent_production_release_event_mutation();

drop policy if exists "platform auditors read release candidates" on public.production_release_candidates;
create policy "platform auditors read release candidates" on public.production_release_candidates for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform auditors read release events" on public.production_release_events;
create policy "platform auditors read release events" on public.production_release_events for select using(public.has_platform_permission('platform.audit.view'));
revoke insert,update,delete on public.production_release_candidates from anon,authenticated;
revoke insert,update,delete on public.production_release_events from anon,authenticated;

create or replace function public.current_production_readiness_snapshot()
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('check_key',check_key,'status',status,'evidence_reference',evidence_reference,'verified_at',verified_at,'updated_at',updated_at) order by check_key),'[]'::jsonb)
  from public.production_readiness_checks
$$;
revoke all on function public.current_production_readiness_snapshot() from public,anon,authenticated;

create or replace function public.create_production_release_candidate(target_release_reference text,target_application_version text,target_commit_sha text,target_artifact_sha256 text)
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); created_id uuid; isolation_id uuid; quality_id uuid; snapshot jsonb;
begin
  if actor is null or not public.has_platform_permission('platform.release.manage') then raise exception 'insufficient_permission'; end if;
  if target_commit_sha !~ '^[0-9a-f]{40}$' or target_artifact_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'invalid_release_digest'; end if;
  if not exists(select 1 from public.production_readiness_checks) or exists(select 1 from public.production_readiness_checks where status not in ('passed','waived')) then raise exception 'production_readiness_blocked'; end if;
  select id into isolation_id from public.rls_verification_runs where status<>'in_progress' and release_reference=btrim(target_release_reference) order by completed_at desc limit 1;
  select id into quality_id from public.quality_verification_runs where status<>'in_progress' and release_reference=btrim(target_release_reference) and application_version=btrim(target_application_version) order by completed_at desc limit 1;
  if isolation_id is null or not exists(select 1 from public.rls_verification_runs where id=isolation_id and status='passed') then raise exception 'matching_rls_verification_required'; end if;
  if quality_id is null or not exists(select 1 from public.quality_verification_runs where id=quality_id and status='passed') then raise exception 'matching_quality_verification_required'; end if;
  snapshot:=public.current_production_readiness_snapshot();
  insert into public.production_release_candidates(release_reference,application_version,commit_sha,artifact_sha256,readiness_snapshot,rls_run_id,quality_run_id,created_by)
  values(btrim(target_release_reference),btrim(target_application_version),target_commit_sha,target_artifact_sha256,snapshot,isolation_id,quality_id,actor) returning id into created_id;
  insert into public.production_release_events(release_id,event_type,evidence_reference,performed_by) values(created_id,'candidate_created','artifact-sha256:'||target_artifact_sha256,actor);
  return created_id;
end $$;
revoke all on function public.create_production_release_candidate(text,text,text,text) from public,anon;
grant execute on function public.create_production_release_candidate(text,text,text,text) to authenticated;

create or replace function public.approve_production_release_candidate(target_release uuid,target_evidence_reference text,target_notes text default '')
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); candidate public.production_release_candidates%rowtype;
begin
  if actor is null or not public.has_platform_permission('platform.release.approve') then raise exception 'insufficient_permission'; end if;
  if char_length(btrim(coalesce(target_evidence_reference,'')))=0 then raise exception 'approval_evidence_required'; end if;
  select * into candidate from public.production_release_candidates where id=target_release and status='awaiting_approval' for update;
  if candidate.id is null then raise exception 'awaiting_release_candidate_required'; end if;
  if candidate.readiness_snapshot is distinct from public.current_production_readiness_snapshot() then raise exception 'readiness_snapshot_changed'; end if;
  if candidate.rls_run_id is distinct from (select id from public.rls_verification_runs where status<>'in_progress' and release_reference=candidate.release_reference order by completed_at desc limit 1) or candidate.quality_run_id is distinct from (select id from public.quality_verification_runs where status<>'in_progress' and release_reference=candidate.release_reference and application_version=candidate.application_version order by completed_at desc limit 1) or not exists(select 1 from public.rls_verification_runs where id=candidate.rls_run_id and status='passed') or not exists(select 1 from public.quality_verification_runs where id=candidate.quality_run_id and status='passed') then raise exception 'verification_regressed'; end if;
  update public.production_release_candidates set status='approved',approved_by=actor,approved_at=now() where id=target_release;
  insert into public.production_release_events(release_id,event_type,evidence_reference,notes,performed_by) values(target_release,'approved',btrim(target_evidence_reference),coalesce(target_notes,''),actor);
  return true;
end $$;
revoke all on function public.approve_production_release_candidate(uuid,text,text) from public,anon;
grant execute on function public.approve_production_release_candidate(uuid,text,text) to authenticated;

create or replace function public.record_production_release_deployment(target_release uuid,target_evidence_reference text,target_notes text default '')
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); candidate public.production_release_candidates%rowtype;
begin
  if actor is null or not public.has_platform_permission('platform.release.approve') then raise exception 'insufficient_permission'; end if;
  if char_length(btrim(coalesce(target_evidence_reference,'')))=0 then raise exception 'deployment_evidence_required'; end if;
  select * into candidate from public.production_release_candidates where id=target_release and status='approved' for update;
  if candidate.id is null then raise exception 'approved_release_candidate_required'; end if;
  if candidate.readiness_snapshot is distinct from public.current_production_readiness_snapshot() then raise exception 'readiness_snapshot_changed'; end if;
  if candidate.rls_run_id is distinct from (select id from public.rls_verification_runs where status<>'in_progress' and release_reference=candidate.release_reference order by completed_at desc limit 1) or candidate.quality_run_id is distinct from (select id from public.quality_verification_runs where status<>'in_progress' and release_reference=candidate.release_reference and application_version=candidate.application_version order by completed_at desc limit 1) or not exists(select 1 from public.rls_verification_runs where id=candidate.rls_run_id and status='passed') or not exists(select 1 from public.quality_verification_runs where id=candidate.quality_run_id and status='passed') then raise exception 'verification_regressed'; end if;
  update public.production_release_candidates set status='released',released_by=actor,released_at=now(),deployment_evidence_reference=btrim(target_evidence_reference) where id=target_release;
  insert into public.production_release_events(release_id,event_type,evidence_reference,notes,performed_by) values(target_release,'deployment_recorded',btrim(target_evidence_reference),coalesce(target_notes,''),actor);
  return true;
end $$;
revoke all on function public.record_production_release_deployment(uuid,text,text) from public,anon;
grant execute on function public.record_production_release_deployment(uuid,text,text) to authenticated;

create or replace function public.cancel_production_release_candidate(target_release uuid,target_notes text)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or not public.has_platform_permission('platform.release.manage') then raise exception 'insufficient_permission'; end if;
  if char_length(btrim(coalesce(target_notes,'')))<10 then raise exception 'cancellation_reason_required'; end if;
  update public.production_release_candidates set status='canceled' where id=target_release and status in ('awaiting_approval','approved');
  if not found then raise exception 'cancelable_release_candidate_required'; end if;
  insert into public.production_release_events(release_id,event_type,notes,performed_by) values(target_release,'canceled',btrim(target_notes),actor);
  return true;
end $$;
revoke all on function public.cancel_production_release_candidate(uuid,text) from public,anon;
grant execute on function public.cancel_production_release_candidate(uuid,text) to authenticated;
