# Multi-tenant design

`tenants.id` is the canonical tenant key. Every customer-owned table in migration `0002_podcastos_multitenant.sql` carries a non-null `tenant_id` foreign key. URL slugs and domain records locate a tenant but never replace the UUID isolation boundary.

## Resolution order

1. Local path: `/demo/ai-at-work/...`
2. Hosted subdomain: `ai-at-work.upnexx.com`
3. Verified custom domain

`lib/tenant.ts` normalizes hosts and returns both the identifier and its source. Production middleware should resolve the host, verify an active `tenant_domains` record, and place the tenant ID in request context.

## Isolation

RLS calls membership helpers using `auth.uid()`. Tenant managers are limited to their tenant. Platform administration uses a protected `app_metadata.platform_role` claim that cannot be edited through browser profile metadata.

Public access is granted only to explicitly published, public podcast, episode, course, and event records. Member and paid access needs entitlement checks against active member subscriptions before launch; the current generic member-read policy must be narrowed and security-tested.

Tenant storage paths begin with `<tenant_uuid>/`. Bucket policies validate the first folder segment against tenant membership.

