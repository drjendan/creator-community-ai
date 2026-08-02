-- Enforce the platform-managed wildcard domain state at the database boundary.
-- This makes tenant creation safe even when an older application action submits
-- the pre-0042 pending state during a rolling production deployment.
select pg_advisory_xact_lock(55404, 43);

create or replace function public.validate_tenant_domain_lifecycle()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.hostname:=lower(trim(trailing '.' from btrim(new.hostname)));

  if new.domain_type='upnexx_subdomain' and new.is_primary then
    new.status:='active';
    new.ssl_status:='active';
    new.verified_at:=coalesce(new.verified_at,now());
    new.dns_verified_at:=coalesce(new.dns_verified_at,now());
    new.ssl_verified_at:=coalesce(new.ssl_verified_at,now());
    new.last_checked_at:=coalesce(new.last_checked_at,now());
    new.failure_reason:='';
  end if;

  if new.domain_type='custom' and position('.' in new.hostname)=0 then raise exception 'custom_domain_requires_fqdn'; end if;
  if new.domain_type='custom' and new.status in ('dns_verified','active') and (new.verified_at is null or new.dns_verified_at is null) then raise exception 'domain_ownership_verification_required'; end if;
  if new.domain_type='custom' and new.status='active' and (new.ssl_status<>'active' or new.ssl_verified_at is null) then raise exception 'active_ssl_verification_required'; end if;
  if new.is_primary and new.status<>'active' then raise exception 'primary_domain_must_be_active'; end if;
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then new.activated_at:=now(); new.deactivated_at:=null; end if;
  if new.status='inactive' and (tg_op='INSERT' or old.status is distinct from 'inactive') then new.deactivated_at:=now(); new.is_primary:=false; new.canonical_redirect_enabled:=false; end if;
  new.updated_at:=now();
  return new;
end $$;

comment on function public.validate_tenant_domain_lifecycle() is
  'Normalizes platform-managed primary domains to active wildcard DNS/TLS and enforces evidence for custom domains.';
