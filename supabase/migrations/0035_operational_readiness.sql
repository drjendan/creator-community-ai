-- Milestone 19: production operational readiness evidence and release gates.
select pg_advisory_xact_lock(55404, 35);

insert into public.platform_permissions(permission_key,label) values
  ('platform.operations.manage','Manage production readiness evidence and recovery records')
on conflict (permission_key) do update set label=excluded.label;
insert into public.platform_role_permissions(role_key,permission_key) values
  ('platform_owner','platform.operations.manage'),
  ('platform_admin','platform.operations.manage')
on conflict do nothing;

create table if not exists public.platform_operational_settings (
  singleton boolean primary key default true check(singleton),
  incident_contact_name text not null default '' check(char_length(incident_contact_name)<=200),
  incident_contact_email text not null default '' check(char_length(incident_contact_email)<=320),
  status_page_url text not null default '' check(char_length(status_page_url)<=1000),
  uptime_monitor_name text not null default '' check(char_length(uptime_monitor_name)<=200),
  backup_owner_name text not null default '' check(char_length(backup_owner_name)<=200),
  recovery_owner_name text not null default '' check(char_length(recovery_owner_name)<=200),
  approved_rpo_minutes integer check(approved_rpo_minutes is null or approved_rpo_minutes>0),
  approved_rto_minutes integer check(approved_rto_minutes is null or approved_rto_minutes>0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.platform_operational_settings(singleton) values(true) on conflict do nothing;
alter table public.platform_operational_settings enable row level security;

create table if not exists public.production_readiness_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text not null unique,
  label text not null check(char_length(label) between 1 and 300),
  category text not null check(category in ('availability','recovery','security','release')),
  status text not null default 'pending' check(status in ('pending','passed','failed','waived')),
  evidence_reference text not null default '' check(char_length(evidence_reference)<=1000),
  notes text not null default '' check(char_length(notes)<=5000),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.production_readiness_checks(check_key,label,category) values
  ('database_backup_configured','Production database backups are configured','recovery'),
  ('storage_backup_configured','Production object storage backups are configured','recovery'),
  ('database_restore_proven','A production-safe database restore exercise is evidenced','recovery'),
  ('storage_restore_proven','A production-safe object restore exercise is evidenced','recovery'),
  ('uptime_monitor_active','External uptime monitoring is active','availability'),
  ('error_alerting_active','Production error alerting reaches the incident owner','availability'),
  ('incident_owner_assigned','A production incident owner and escalation route are assigned','availability'),
  ('rollback_rehearsed','The production rollback procedure is rehearsed','release'),
  ('production_rls_matrix','Production RLS and cross-tenant isolation are verified','security'),
  ('production_redirects_verified','Production authentication redirects are verified','security'),
  ('dns_ssl_verified','Production DNS and SSL are verified','release')
on conflict(check_key) do update set label=excluded.label,category=excluded.category;
create index if not exists idx_production_readiness_status on public.production_readiness_checks(status,category);
alter table public.production_readiness_checks enable row level security;

create table if not exists public.recovery_verifications (
  id uuid primary key default gen_random_uuid(),
  verification_type text not null check(verification_type in ('database_backup','storage_backup','database_restore','storage_restore')),
  environment text not null default 'production' check(environment='production'),
  status text not null check(status in ('passed','failed','partial')),
  verified_at timestamptz not null,
  evidence_reference text not null default '' check(char_length(evidence_reference)<=1000),
  notes text not null default '' check(char_length(notes)<=5000),
  measured_recovery_minutes integer check(measured_recovery_minutes is null or measured_recovery_minutes>=0),
  recovery_point_age_minutes integer check(recovery_point_age_minutes is null or recovery_point_age_minutes>=0),
  performed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_recovery_verifications_history on public.recovery_verifications(verification_type,verified_at desc);
alter table public.recovery_verifications enable row level security;

create or replace function public.validate_operational_evidence()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_table_name='production_readiness_checks' then
    if new.status='pending' then new.verified_by:=null; new.verified_at:=null;
    elsif new.verified_by is null or new.verified_at is null or btrim(new.evidence_reference)='' then
      raise exception 'readiness_evidence_required';
    end if;
    if new.status='waived' and char_length(btrim(new.notes))<10 then raise exception 'waiver_notes_required'; end if;
    new.updated_at:=now();
  elsif tg_table_name='recovery_verifications' and new.status='passed' and btrim(new.evidence_reference)='' then
    raise exception 'recovery_evidence_required';
  end if;
  return new;
end $$;
drop trigger if exists validate_production_readiness_evidence on public.production_readiness_checks;
create trigger validate_production_readiness_evidence before insert or update on public.production_readiness_checks for each row execute function public.validate_operational_evidence();
drop trigger if exists validate_recovery_verification_evidence on public.recovery_verifications;
create trigger validate_recovery_verification_evidence before insert or update on public.recovery_verifications for each row execute function public.validate_operational_evidence();

drop policy if exists "platform auditors read operational settings" on public.platform_operational_settings;
create policy "platform auditors read operational settings" on public.platform_operational_settings for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform operations managers update operational settings" on public.platform_operational_settings;
create policy "platform operations managers update operational settings" on public.platform_operational_settings for update using(public.has_platform_permission('platform.operations.manage')) with check(public.has_platform_permission('platform.operations.manage'));
drop policy if exists "platform auditors read readiness checks" on public.production_readiness_checks;
create policy "platform auditors read readiness checks" on public.production_readiness_checks for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform operations managers update readiness checks" on public.production_readiness_checks;
create policy "platform operations managers update readiness checks" on public.production_readiness_checks for update using(public.has_platform_permission('platform.operations.manage')) with check(public.has_platform_permission('platform.operations.manage'));
drop policy if exists "platform auditors read recovery verifications" on public.recovery_verifications;
create policy "platform auditors read recovery verifications" on public.recovery_verifications for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform operations managers add recovery verifications" on public.recovery_verifications;
create policy "platform operations managers add recovery verifications" on public.recovery_verifications for insert with check(public.has_platform_permission('platform.operations.manage'));
