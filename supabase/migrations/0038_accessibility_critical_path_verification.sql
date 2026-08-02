-- Milestone 22: accessibility and authenticated critical-path release evidence.
select pg_advisory_xact_lock(55404, 38);

insert into public.platform_permissions(permission_key,label) values
  ('platform.quality.manage','Manage accessibility and authenticated critical-path evidence')
on conflict(permission_key) do update set label=excluded.label;
insert into public.platform_role_permissions(role_key,permission_key) values
  ('platform_owner','platform.quality.manage'),('platform_admin','platform.quality.manage'),('platform_developer','platform.quality.manage')
on conflict do nothing;

insert into public.production_readiness_checks(check_key,label,category) values
  ('accessibility_verified','Critical production workflows pass accessibility review','release'),
  ('authenticated_critical_paths_verified','Authenticated desktop and mobile critical paths pass','release')
on conflict(check_key) do update set label=excluded.label,category=excluded.category;

create table if not exists public.quality_verification_case_catalog (
  case_key text primary key,
  label text not null check(char_length(label) between 1 and 300),
  description text not null check(char_length(description) between 1 and 2000),
  category text not null check(category in ('accessibility','authenticated_flow','browser_mobile','defect_review')),
  verification_mode text not null check(verification_mode in ('automated','manual_keyboard','manual_assistive','manual_visual')),
  critical boolean not null default true,
  sort_order integer not null,
  active boolean not null default true
);
insert into public.quality_verification_case_catalog(case_key,label,description,category,verification_mode,sort_order) values
  ('skip_and_route_focus','Skip navigation and route focus','Skip navigation is first, visible on focus, and route transitions announce and focus application content.','accessibility','automated',10),
  ('keyboard_navigation','Keyboard-only critical workflows','All critical controls are reachable and operable without a pointer.','accessibility','manual_keyboard',20),
  ('dialog_focus','Modal focus lifecycle','Dialogs contain focus, close with Escape, and restore focus to the trigger.','accessibility','automated',30),
  ('screen_reader_smoke','Screen-reader smoke review','Headings, landmarks, names, errors, statuses, tables, and dynamic updates are understandable.','accessibility','manual_assistive',40),
  ('zoom_reflow','Zoom and reflow','Critical workflows remain usable at 200% zoom and approximately 320 CSS pixels.','accessibility','manual_visual',50),
  ('reduced_motion','Reduced-motion behavior','Motion is minimized and smooth scrolling is disabled when reduced motion is requested.','accessibility','automated',60),
  ('tenant_brand_contrast','Tenant-brand contrast safeguards','Configured tenant colors retain usable text and focus contrast on critical controls.','accessibility','manual_visual',70),
  ('tenant_admin_desktop','Authenticated tenant administrator desktop','Sign-in, dashboard, team, branding, content, and permission-denied paths pass on desktop.','authenticated_flow','automated',80),
  ('tenant_admin_mobile','Authenticated tenant administrator mobile','Navigation and critical tenant administration paths pass on a mobile viewport.','authenticated_flow','automated',90),
  ('member_entitlement_paths','Authenticated member entitlements','Free, member, paid, suspended, and unauthorized member paths show the correct result.','authenticated_flow','automated',100),
  ('platform_admin_paths','Authenticated platform administration','Platform dashboard, tenant, security, operations, isolation, and quality routes enforce permissions.','authenticated_flow','automated',110),
  ('supported_browsers','Supported browser smoke matrix','Current Chrome, Edge, Firefox, Safari, iOS Safari, and Android Chrome are reviewed.','browser_mobile','manual_visual',120),
  ('critical_defect_review','Critical and high defect review','No unresolved critical/high defect remains; any exception requires a separately approved release decision.','defect_review','manual_visual',130)
on conflict(case_key) do update set label=excluded.label,description=excluded.description,category=excluded.category,verification_mode=excluded.verification_mode,critical=excluded.critical,sort_order=excluded.sort_order;
alter table public.quality_verification_case_catalog enable row level security;

create table if not exists public.quality_verification_runs (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'production' check(environment='production'),
  status text not null default 'in_progress' check(status in ('in_progress','passed','failed','canceled')),
  release_reference text not null check(char_length(release_reference) between 1 and 500),
  application_version text not null check(char_length(application_version) between 1 and 200),
  notes text not null default '' check(char_length(notes)<=5000),
  started_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,
  check((status='in_progress' and completed_by is null and completed_at is null) or (status<>'in_progress' and completed_by is not null and completed_at is not null))
);
create index if not exists idx_quality_verification_runs_history on public.quality_verification_runs(started_at desc,status);
alter table public.quality_verification_runs enable row level security;

create table if not exists public.quality_verification_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quality_verification_runs(id) on delete restrict,
  case_key text not null references public.quality_verification_case_catalog(case_key) on delete restrict,
  status text not null default 'pending' check(status in ('pending','passed','failed','blocked')),
  evidence_reference text not null default '' check(char_length(evidence_reference)<=1000),
  notes text not null default '' check(char_length(notes)<=5000),
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(run_id,case_key),
  check((status='pending' and verified_by is null and verified_at is null) or (status<>'pending' and verified_by is not null and verified_at is not null and char_length(btrim(evidence_reference))>0))
);
create index if not exists idx_quality_verification_results_run on public.quality_verification_results(run_id,status);
alter table public.quality_verification_results enable row level security;

revoke insert,update,delete on public.quality_verification_case_catalog from anon,authenticated;
revoke insert,update,delete on public.quality_verification_runs from anon,authenticated;
revoke insert,update,delete on public.quality_verification_results from anon,authenticated;
drop policy if exists "platform auditors read quality case catalog" on public.quality_verification_case_catalog;
create policy "platform auditors read quality case catalog" on public.quality_verification_case_catalog for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform auditors read quality runs" on public.quality_verification_runs;
create policy "platform auditors read quality runs" on public.quality_verification_runs for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform auditors read quality results" on public.quality_verification_results;
create policy "platform auditors read quality results" on public.quality_verification_results for select using(public.has_platform_permission('platform.audit.view'));

create or replace function public.start_production_quality_verification(target_release_reference text,target_application_version text,target_notes text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare created_run_id uuid; actor uuid:=auth.uid();
begin
  if actor is null or not public.has_platform_permission('platform.quality.manage') then raise exception 'insufficient_permission'; end if;
  if btrim(target_release_reference)='' or btrim(target_application_version)='' then raise exception 'release_and_version_required'; end if;
  insert into public.quality_verification_runs(release_reference,application_version,notes,started_by) values(btrim(target_release_reference),btrim(target_application_version),coalesce(target_notes,''),actor) returning id into created_run_id;
  insert into public.quality_verification_results(run_id,case_key) select created_run_id,case_key from public.quality_verification_case_catalog where active;
  return created_run_id;
end $$;
revoke all on function public.start_production_quality_verification(text,text,text) from public,anon;
grant execute on function public.start_production_quality_verification(text,text,text) to authenticated;

create or replace function public.finalize_production_quality_verification(target_run uuid)
returns text language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); final_status text;
begin
  if actor is null or not public.has_platform_permission('platform.quality.manage') then raise exception 'insufficient_permission'; end if;
  if not exists(select 1 from public.quality_verification_runs where id=target_run and status='in_progress') then raise exception 'active_quality_run_required'; end if;
  if exists(select 1 from public.quality_verification_results where run_id=target_run and status='pending') then raise exception 'pending_quality_results'; end if;
  final_status:=case when exists(select 1 from public.quality_verification_results where run_id=target_run and status in ('failed','blocked')) then 'failed' else 'passed' end;
  update public.quality_verification_runs set status=final_status,completed_by=actor,completed_at=now() where id=target_run;
  update public.production_readiness_checks set status=final_status,evidence_reference='quality-verification:'||target_run,notes='Derived from the finalized accessibility and authenticated critical-path run.',verified_by=actor,verified_at=now(),updated_at=now() where check_key in ('accessibility_verified','authenticated_critical_paths_verified');
  return final_status;
end $$;
revoke all on function public.finalize_production_quality_verification(uuid) from public,anon;
grant execute on function public.finalize_production_quality_verification(uuid) to authenticated;
