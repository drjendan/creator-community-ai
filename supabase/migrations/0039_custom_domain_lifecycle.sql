-- Milestone 23: production custom-domain ownership, activation, and rollback lifecycle.
select pg_advisory_xact_lock(55404, 39);

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.domains.manage','Manage organization domain requests and DNS instructions')
on conflict(permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_owner','tenant.domains.manage'),('tenant_admin','tenant.domains.manage')
on conflict do nothing;

alter table public.tenant_domains
  add column if not exists verification_record_name text,
  add column if not exists verification_record_value text,
  add column if not exists dns_target text,
  add column if not exists dns_verified_at timestamptz,
  add column if not exists ssl_verified_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists failure_reason text not null default '',
  add column if not exists canonical_redirect_enabled boolean not null default false,
  add column if not exists activated_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.tenant_domains set hostname=lower(trim(trailing '.' from btrim(hostname)));
update public.tenant_domains set status='active' where domain_type='upnexx_subdomain' and status='verified';
update public.tenant_domains set status='pending',is_primary=false,canonical_redirect_enabled=false,verified_at=null,ssl_status='pending',failure_reason='Reverification required by migration 0039.' where domain_type='custom' and status='verified';
update public.tenant_domains set status='pending',is_primary=false,canonical_redirect_enabled=false,verified_at=null,dns_verified_at=null,ssl_status='pending',ssl_verified_at=null,failure_reason='Reverification required by migration 0039.' where domain_type='custom' and status='active' and (verified_at is null or dns_verified_at is null or ssl_status<>'active' or ssl_verified_at is null);

alter table public.tenant_domains drop constraint if exists tenant_domains_status_check;
alter table public.tenant_domains add constraint tenant_domains_status_check check(status in ('pending','dns_verified','active','failed','inactive'));
alter table public.tenant_domains drop constraint if exists tenant_domains_hostname_format_check;
alter table public.tenant_domains add constraint tenant_domains_hostname_format_check check(hostname=lower(hostname) and hostname !~ '[/:]' and char_length(hostname) between 3 and 253);
alter table public.tenant_domains drop constraint if exists tenant_domains_failure_reason_length;
alter table public.tenant_domains add constraint tenant_domains_failure_reason_length check(char_length(failure_reason)<=1000);
create unique index if not exists uq_tenant_domains_normalized_hostname on public.tenant_domains(lower(hostname));
create unique index if not exists uq_tenant_active_custom_domain on public.tenant_domains(tenant_id) where domain_type='custom' and status='active';

create table if not exists public.tenant_domain_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.tenant_domains(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  check_type text not null check(check_type in ('ownership_txt','dns_route','ssl_certificate','activation','rollback')),
  status text not null check(status in ('passed','failed','blocked')),
  evidence_reference text not null default '' check(char_length(evidence_reference)<=1000),
  observed jsonb not null default '{}',
  notes text not null default '' check(char_length(notes)<=5000),
  performed_by uuid not null references auth.users(id) on delete restrict,
  performed_at timestamptz not null default now(),
  check(status<>'passed' or char_length(btrim(evidence_reference))>0)
);
create index if not exists idx_domain_verification_history on public.tenant_domain_verification_attempts(domain_id,performed_at desc);
alter table public.tenant_domain_verification_attempts enable row level security;

create or replace function public.validate_tenant_domain_lifecycle()
returns trigger language plpgsql set search_path=public as $$
begin
  new.hostname:=lower(trim(trailing '.' from btrim(new.hostname)));
  if new.domain_type='custom' and position('.' in new.hostname)=0 then raise exception 'custom_domain_requires_fqdn'; end if;
  if new.domain_type='custom' and new.status in ('dns_verified','active') and (new.verified_at is null or new.dns_verified_at is null) then raise exception 'domain_ownership_verification_required'; end if;
  if new.domain_type='custom' and new.status='active' and (new.ssl_status<>'active' or new.ssl_verified_at is null) then raise exception 'active_ssl_verification_required'; end if;
  if new.is_primary and new.status<>'active' then raise exception 'primary_domain_must_be_active'; end if;
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then new.activated_at:=now(); new.deactivated_at:=null; end if;
  if new.status='inactive' and (tg_op='INSERT' or old.status is distinct from 'inactive') then new.deactivated_at:=now(); new.is_primary:=false; new.canonical_redirect_enabled:=false; end if;
  new.updated_at:=now();
  return new;
end $$;
drop trigger if exists validate_tenant_domain_lifecycle on public.tenant_domains;
create trigger validate_tenant_domain_lifecycle before insert or update on public.tenant_domains for each row execute function public.validate_tenant_domain_lifecycle();

drop policy if exists "tenant members read" on public.tenant_domains;
drop policy if exists "tenant managers insert" on public.tenant_domains;
drop policy if exists "tenant managers update" on public.tenant_domains;
drop policy if exists "tenant managers delete" on public.tenant_domains;
drop policy if exists "domain managers read tenant domains" on public.tenant_domains;
create policy "domain managers read tenant domains" on public.tenant_domains for select using(public.has_tenant_permission(tenant_id,'tenant.domains.manage') or public.has_platform_permission('platform.audit.view'));
drop policy if exists "domain managers create domain requests" on public.tenant_domains;
create policy "domain managers create domain requests" on public.tenant_domains for insert with check(public.has_tenant_permission(tenant_id,'tenant.domains.manage') and domain_type='custom' and status='pending' and not is_primary);
drop policy if exists "domain managers update pending domains" on public.tenant_domains;
create policy "domain managers update pending domains" on public.tenant_domains for update using(public.has_tenant_permission(tenant_id,'tenant.domains.manage') and status in ('pending','failed','inactive')) with check(public.has_tenant_permission(tenant_id,'tenant.domains.manage') and status in ('pending','inactive'));

drop policy if exists "domain managers read verification attempts" on public.tenant_domain_verification_attempts;
create policy "domain managers read verification attempts" on public.tenant_domain_verification_attempts for select using(public.has_tenant_permission(tenant_id,'tenant.domains.manage') or public.has_platform_permission('platform.audit.view'));
revoke insert,update,delete on public.tenant_domain_verification_attempts from anon,authenticated;

create or replace function public.validate_domain_verification_attempt()
returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.tenant_domains where id=new.domain_id and tenant_id=new.tenant_id) then raise exception 'domain_tenant_mismatch'; end if;
  return new;
end $$;
drop trigger if exists validate_domain_verification_attempt on public.tenant_domain_verification_attempts;
create trigger validate_domain_verification_attempt before insert on public.tenant_domain_verification_attempts for each row execute function public.validate_domain_verification_attempt();

create or replace function public.resolve_active_tenant_domain(target_hostname text)
returns text language sql stable security definer set search_path=public as $$
  select t.slug from public.tenant_domains d join public.tenants t on t.id=d.tenant_id
  where d.hostname=lower(trim(trailing '.' from split_part(target_hostname,':',1))) and d.domain_type='custom' and d.status='active' and d.verified_at is not null and d.dns_verified_at is not null and d.ssl_status='active' and d.ssl_verified_at is not null and t.status='active' and t.deleted_at is null limit 1
$$;
revoke all on function public.resolve_active_tenant_domain(text) from public;
grant execute on function public.resolve_active_tenant_domain(text) to anon,authenticated,service_role;

create or replace function public.resolve_tenant_canonical_domain(target_slug text)
returns text language sql stable security definer set search_path=public as $$
  select d.hostname from public.tenant_domains d join public.tenants t on t.id=d.tenant_id
  where t.slug=lower(btrim(target_slug)) and t.status='active' and t.deleted_at is null and d.domain_type='custom' and d.status='active' and d.is_primary and d.canonical_redirect_enabled and d.verified_at is not null and d.dns_verified_at is not null and d.ssl_status='active' and d.ssl_verified_at is not null limit 1
$$;
revoke all on function public.resolve_tenant_canonical_domain(text) from public;
grant execute on function public.resolve_tenant_canonical_domain(text) to anon,authenticated,service_role;

create or replace function public.activate_tenant_custom_domain(target_domain uuid,target_evidence_reference text)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); target_tenant uuid;
begin
  if actor is null or not public.has_platform_permission('platform.operations.manage') then raise exception 'insufficient_permission'; end if;
  if char_length(btrim(coalesce(target_evidence_reference,'')))=0 then raise exception 'activation_evidence_required'; end if;
  select tenant_id into target_tenant from public.tenant_domains where id=target_domain and domain_type='custom' and status in ('dns_verified','inactive') and verified_at is not null and dns_verified_at is not null and ssl_status='active' and ssl_verified_at is not null for update;
  if target_tenant is null then raise exception 'verified_domain_and_ssl_required'; end if;
  update public.tenant_domains set status='inactive',is_primary=false,canonical_redirect_enabled=false,updated_by=actor where tenant_id=target_tenant and domain_type='custom' and status='active' and id<>target_domain;
  update public.tenant_domains set status='active',is_primary=true,canonical_redirect_enabled=true,failure_reason='',updated_by=actor where id=target_domain;
  insert into public.tenant_domain_verification_attempts(domain_id,tenant_id,check_type,status,evidence_reference,performed_by) values(target_domain,target_tenant,'activation','passed',target_evidence_reference,actor);
  if exists(select 1 from public.tenant_domain_verification_attempts where domain_id=target_domain and check_type='rollback' and status='passed') then
    update public.production_readiness_checks set status='passed',evidence_reference='custom-domain:'||target_domain,notes='Ownership, DNS, SSL, activation, and rollback rehearsal are recorded.',verified_by=actor,verified_at=now(),updated_at=now() where check_key='custom_domain_verified';
  end if;
  return true;
end $$;
revoke all on function public.activate_tenant_custom_domain(uuid,text) from public,anon;
grant execute on function public.activate_tenant_custom_domain(uuid,text) to authenticated;

create or replace function public.rollback_tenant_custom_domain(target_domain uuid,target_evidence_reference text,target_notes text default '')
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); target_tenant uuid;
begin
  if actor is null or not public.has_platform_permission('platform.operations.manage') then raise exception 'insufficient_permission'; end if;
  if char_length(btrim(coalesce(target_evidence_reference,'')))=0 then raise exception 'rollback_evidence_required'; end if;
  select tenant_id into target_tenant from public.tenant_domains where id=target_domain and domain_type='custom' and status='active' for update;
  if target_tenant is null then raise exception 'active_custom_domain_required'; end if;
  update public.tenant_domains set status='inactive',is_primary=false,canonical_redirect_enabled=false,updated_by=actor where id=target_domain;
  insert into public.tenant_domain_verification_attempts(domain_id,tenant_id,check_type,status,evidence_reference,notes,performed_by) values(target_domain,target_tenant,'rollback','passed',target_evidence_reference,coalesce(target_notes,''),actor);
  update public.production_readiness_checks set status='pending',evidence_reference='',notes='Rollback is proven; reactivate the verified domain to complete the gate.',verified_by=null,verified_at=null,updated_at=now() where check_key='custom_domain_verified';
  return true;
end $$;
revoke all on function public.rollback_tenant_custom_domain(uuid,text,text) from public,anon;
grant execute on function public.rollback_tenant_custom_domain(uuid,text,text) to authenticated;

insert into public.production_readiness_checks(check_key,label,category) values
  ('custom_domain_verified','Production custom-domain ownership, DNS route, SSL, canonical behavior, and rollback are verified','release')
on conflict(check_key) do update set label=excluded.label,category=excluded.category;
