# Milestone 23 — Custom-Domain Production Lifecycle

Milestone 23 implements the production-only custom-domain lifecycle. It belongs to the combined direct production release and does not create, use, or promote through staging.

## Delivered

- Tenant-owner and tenant-administrator custom-domain requests with validated, normalized hostnames.
- Random TXT ownership challenges and explicit production CNAME instructions.
- Live server-side TXT and route checks; configuration values never count as verification.
- Append-only ownership, route, certificate, activation, and rollback evidence.
- Platform-operations certificate review with a required evidence reference.
- Database-enforced activation prerequisites: current ownership, route, and SSL evidence.
- Public-safe custom-host lookup that returns only an active tenant slug and exposes no tenant secrets.
- Middleware routing for verified active custom hosts.
- Permanent canonical redirects from the managed public tenant hostname after activation.
- A preserved managed-subdomain rollback route and an evidence-backed rollback procedure.
- A production-readiness gate that passes only after rollback has been proven and the verified domain has been reactivated.
- Narrow tenant/platform permissions and no tenant path for directly deactivating an active domain.

## Required migration

Run `supabase/migrations/0039_custom_domain_lifecycle.sql` after `0038`, then run `supabase/verify_upnexx_schema.sql`. Existing custom domains are intentionally returned to pending when fresh migration-0039 evidence is absent. This is fail-closed behavior.

## Production execution

1. Set `CUSTOM_DOMAIN_CNAME_TARGET` to the exact hostname accepted by the production hosting provider.
2. Deploy the combined application and migration set only after every milestone is complete and the release is approved.
3. Have a tenant domain manager create the request and publish both displayed DNS records.
4. In Platform Admin → Custom Domains, run live DNS verification.
5. Add the hostname to the production hosting provider and wait for certificate issuance.
6. Inspect the certificate hostname, issuer, validity, chain, and HTTPS behavior; record a non-secret evidence reference.
7. Activate the domain and verify public paths, query strings, tenant branding, authentication boundaries, and the 308 managed-host canonical redirect.
8. Roll back once to the managed tenant hostname, record evidence, confirm availability, then reactivate and repeat the smoke test.

Installing migration 0039 does not prove external DNS, SSL, routing, or rollback. Those checks stay pending until real production evidence is recorded. Never place DNS-provider credentials, certificate private keys, service-role keys, or customer data in notes.

## Rollback behavior

Platform rollback atomically marks the custom domain inactive, removes primary/canonical status, appends rollback evidence, and resets the readiness gate to pending. The managed tenant subdomain remains available. Database rollback SQL is neither required nor recommended; correct forward and retain the audit history.
