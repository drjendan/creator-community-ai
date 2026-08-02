-- Managed UpNexx subdomains are covered by platform-owned wildcard DNS and TLS.
-- Migration 0039 requires every primary domain to be active, so managed domains
-- must not be provisioned in the pending custom-domain verification state.
select pg_advisory_xact_lock(55404, 42);

update public.tenant_domains domain
set
  status = 'active',
  ssl_status = 'active',
  verified_at = coalesce(domain.verified_at, now()),
  dns_verified_at = coalesce(domain.dns_verified_at, now()),
  ssl_verified_at = coalesce(domain.ssl_verified_at, now()),
  last_checked_at = coalesce(domain.last_checked_at, now()),
  activated_at = coalesce(domain.activated_at, now()),
  deactivated_at = null,
  failure_reason = '',
  updated_at = now()
from public.tenants tenant
where domain.tenant_id = tenant.id
  and domain.domain_type = 'upnexx_subdomain'
  and tenant.status in ('active', 'pending')
  and tenant.deleted_at is null
  and (
    domain.status <> 'active'
    or domain.ssl_status <> 'active'
    or domain.verified_at is null
    or domain.dns_verified_at is null
    or domain.ssl_verified_at is null
  );

comment on column public.tenant_domains.domain_type is
  'upnexx_subdomain uses platform-managed wildcard DNS/TLS; custom domains require the evidence lifecycle.';
