-- Milestone 21: production-safe RLS and tenant-isolation verification evidence.
select pg_advisory_xact_lock(55404, 37);

create table if not exists public.rls_verification_case_catalog (
  case_key text primary key,
  label text not null check(char_length(label) between 1 and 300),
  description text not null check(char_length(description) between 1 and 2000),
  verification_mode text not null check(verification_mode in ('automatic_metadata','manual_behavioral')),
  risk_level text not null check(risk_level in ('critical','high')),
  sort_order integer not null,
  active boolean not null default true
);
insert into public.rls_verification_case_catalog(case_key,label,description,verification_mode,risk_level,sort_order) values
  ('tenant_tables_rls_enabled','Tenant tables have RLS enabled','Every public table containing tenant_id must have row-level security enabled.','automatic_metadata','critical',10),
  ('security_definer_search_path','Security-definer functions fix search_path','Every public security-definer function must set a search_path.','automatic_metadata','high',20),
  ('private_storage_policy_boundary','Private Storage has no broad tenant-member policy','The private tenant-assets bucket must use protected management policies and no legacy broad read policy.','automatic_metadata','critical',30),
  ('cross_tenant_read_denied','Cross-tenant reads are denied','An authenticated user from Tenant A cannot read protected Tenant B records.','manual_behavioral','critical',40),
  ('cross_tenant_write_denied','Cross-tenant writes are denied','An authenticated manager from Tenant A cannot insert or mutate Tenant B records.','manual_behavioral','critical',50),
  ('suspended_membership_denied','Suspended membership loses access','A suspended tenant membership cannot read member-only tenant records.','manual_behavioral','critical',60),
  ('guest_public_boundary','Guest and public boundaries hold','Anonymous and guest sessions see only explicitly public records.','manual_behavioral','high',70),
  ('paid_content_boundary','Paid content entitlement is enforced','A member without the required active plan cannot access paid content.','manual_behavioral','critical',80),
  ('user_owned_ai_boundary','User-owned AI records remain private','One member cannot read another member’s conversations, messages, or recommendation feedback.','manual_behavioral','critical',90),
  ('storage_path_isolation','Storage tenant paths are isolated','Tenant A managers cannot read, write, update, or delete Tenant B managed objects.','manual_behavioral','critical',100),
  ('platform_authority_boundary','Platform authority is permission bounded','Platform support, analyst, administrator, and owner roles receive only their catalog permissions.','manual_behavioral','critical',110)
on conflict(case_key) do update set label=excluded.label,description=excluded.description,verification_mode=excluded.verification_mode,risk_level=excluded.risk_level,sort_order=excluded.sort_order;
alter table public.rls_verification_case_catalog enable row level security;

create table if not exists public.rls_verification_runs (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'production' check(environment='production'),
  status text not null default 'in_progress' check(status in ('in_progress','passed','failed','canceled')),
  tenant_a_id uuid not null references public.tenants(id) on delete restrict,
  tenant_b_id uuid not null references public.tenants(id) on delete restrict,
  release_reference text not null check(char_length(release_reference) between 1 and 500),
  notes text not null default '' check(char_length(notes)<=5000),
  started_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) on delete restrict,
  completed_at timestamptz,
  check(tenant_a_id<>tenant_b_id),
  check((status='in_progress' and completed_at is null and completed_by is null) or (status<>'in_progress' and completed_at is not null and completed_by is not null))
);
create index if not exists idx_rls_verification_runs_history on public.rls_verification_runs(started_at desc,status);
alter table public.rls_verification_runs enable row level security;

create table if not exists public.rls_verification_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.rls_verification_runs(id) on delete restrict,
  case_key text not null references public.rls_verification_case_catalog(case_key) on delete restrict,
  status text not null default 'pending' check(status in ('pending','passed','failed','blocked')),
  evidence_reference text not null default '' check(char_length(evidence_reference)<=1000),
  evidence jsonb not null default '{}',
  notes text not null default '' check(char_length(notes)<=5000),
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(run_id,case_key),
  check((status='pending' and verified_by is null and verified_at is null) or (status<>'pending' and verified_by is not null and verified_at is not null and char_length(btrim(evidence_reference))>0))
);
create index if not exists idx_rls_verification_results_run on public.rls_verification_results(run_id,status);
alter table public.rls_verification_results enable row level security;

-- Mutations flow through trusted server routes or the security-definer lifecycle functions.
-- Authenticated clients may read through RLS but cannot rewrite automatic evidence directly.
revoke insert,update,delete on public.rls_verification_case_catalog from anon,authenticated;
revoke insert,update,delete on public.rls_verification_runs from anon,authenticated;
revoke insert,update,delete on public.rls_verification_results from anon,authenticated;

drop policy if exists "platform auditors read RLS case catalog" on public.rls_verification_case_catalog;
create policy "platform auditors read RLS case catalog" on public.rls_verification_case_catalog for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform auditors read RLS verification runs" on public.rls_verification_runs;
create policy "platform auditors read RLS verification runs" on public.rls_verification_runs for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform security managers create RLS verification runs" on public.rls_verification_runs;
create policy "platform security managers create RLS verification runs" on public.rls_verification_runs for insert with check(public.has_platform_permission('platform.security.manage') and started_by=auth.uid());
drop policy if exists "platform security managers update RLS verification runs" on public.rls_verification_runs;
create policy "platform security managers update RLS verification runs" on public.rls_verification_runs for update using(public.has_platform_permission('platform.security.manage')) with check(public.has_platform_permission('platform.security.manage'));
drop policy if exists "platform auditors read RLS verification results" on public.rls_verification_results;
create policy "platform auditors read RLS verification results" on public.rls_verification_results for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform security managers create RLS verification results" on public.rls_verification_results;
create policy "platform security managers create RLS verification results" on public.rls_verification_results for insert with check(public.has_platform_permission('platform.security.manage'));
drop policy if exists "platform security managers update RLS verification results" on public.rls_verification_results;
create policy "platform security managers update RLS verification results" on public.rls_verification_results for update using(public.has_platform_permission('platform.security.manage')) with check(public.has_platform_permission('platform.security.manage'));

create or replace function public.start_production_rls_verification(target_tenant_a uuid,target_tenant_b uuid,target_release_reference text,target_notes text default '')
returns uuid language plpgsql security definer set search_path=public,pg_catalog as $$
declare created_run_id uuid; actor uuid:=auth.uid(); failing text[];
begin
  if actor is null or not public.has_platform_permission('platform.security.manage') then raise exception 'insufficient_permission'; end if;
  if target_tenant_a=target_tenant_b or not exists(select 1 from public.tenants where id=target_tenant_a) or not exists(select 1 from public.tenants where id=target_tenant_b) then raise exception 'two_distinct_tenants_required'; end if;
  if char_length(btrim(target_release_reference))<1 then raise exception 'release_reference_required'; end if;
  insert into public.rls_verification_runs(tenant_a_id,tenant_b_id,release_reference,notes,started_by) values(target_tenant_a,target_tenant_b,btrim(target_release_reference),coalesce(target_notes,''),actor) returning id into created_run_id;
  insert into public.rls_verification_results(run_id,case_key) select created_run_id,case_key from public.rls_verification_case_catalog where active;

  select array_agg(c.relname order by c.relname) into failing from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and not a.attisdropped) and not c.relrowsecurity;
  update public.rls_verification_results set status=case when coalesce(cardinality(failing),0)=0 then 'passed' else 'failed' end,evidence_reference='database-catalog:'||created_run_id,evidence=jsonb_build_object('tables_without_rls',coalesce(to_jsonb(failing),'[]'::jsonb)),verified_by=actor,verified_at=now(),updated_at=now() where rls_verification_results.run_id=created_run_id and case_key='tenant_tables_rls_enabled';

  select array_agg(p.proname order by p.proname) into failing from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not exists(select 1 from unnest(coalesce(p.proconfig,array[]::text[])) setting where setting like 'search_path=%');
  update public.rls_verification_results set status=case when coalesce(cardinality(failing),0)=0 then 'passed' else 'failed' end,evidence_reference='database-catalog:'||created_run_id,evidence=jsonb_build_object('functions_without_fixed_search_path',coalesce(to_jsonb(failing),'[]'::jsonb)),verified_by=actor,verified_at=now(),updated_at=now() where rls_verification_results.run_id=created_run_id and case_key='security_definer_search_path';

  update public.rls_verification_results set status=case when exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='protected media managers read') and not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tenant scoped storage read') then 'passed' else 'failed' end,evidence_reference='database-catalog:'||created_run_id,evidence=jsonb_build_object('protected_policy_present',exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='protected media managers read'),'legacy_broad_policy_absent',not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tenant scoped storage read')),verified_by=actor,verified_at=now(),updated_at=now() where rls_verification_results.run_id=created_run_id and case_key='private_storage_policy_boundary';
  return created_run_id;
end $$;
revoke all on function public.start_production_rls_verification(uuid,uuid,text,text) from public,anon;
grant execute on function public.start_production_rls_verification(uuid,uuid,text,text) to authenticated;

create or replace function public.finalize_production_rls_verification(target_run uuid)
returns text language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); final_status text;
begin
  if actor is null or not public.has_platform_permission('platform.security.manage') then raise exception 'insufficient_permission'; end if;
  if not exists(select 1 from public.rls_verification_runs where id=target_run and status='in_progress') then raise exception 'active_verification_run_required'; end if;
  if exists(select 1 from public.rls_verification_results where run_id=target_run and status='pending') then raise exception 'pending_verification_results'; end if;
  final_status:=case when exists(select 1 from public.rls_verification_results where run_id=target_run and status in ('failed','blocked')) then 'failed' else 'passed' end;
  update public.rls_verification_runs set status=final_status,completed_by=actor,completed_at=now() where id=target_run;
  update public.production_readiness_checks set status=final_status,evidence_reference='rls-verification:'||target_run,notes='Derived from the finalized production isolation verification run.',verified_by=actor,verified_at=now(),updated_at=now() where check_key='production_rls_matrix';
  return final_status;
end $$;
revoke all on function public.finalize_production_rls_verification(uuid) from public,anon;
grant execute on function public.finalize_production_rls_verification(uuid) to authenticated;
