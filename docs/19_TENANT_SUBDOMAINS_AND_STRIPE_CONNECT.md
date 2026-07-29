# Tenant subdomains and optional Stripe Connect

## What is implemented

- Every newly provisioned tenant receives a primary `slug.upnexx.net` domain record.
- Middleware resolves the tenant from the hostname and passes a server-controlled tenant identifier to authenticated tenant routes.
- Tenant authorization is evaluated against that hostname-selected tenant. A platform role never changes the current tenant implicitly.
- Stripe is not required when a tenant is created. Tenant administrators can start or resume hosted Stripe onboarding at Organization Settings → Integrations → Payments.
- Free plans remain usable without Stripe. Paid membership plans are saved as inactive drafts until charges, the `card_payments` capability, and the UpNexx application fee configuration are all active.
- Stripe account state is refreshed from Stripe and by a signed `account.updated` Connect webhook.

## Apply the database change

Run `supabase/migrations/0013_tenant_domains_stripe_connect.sql` once in the Supabase SQL editor. It is idempotent for schema objects and policies. Existing tenants are not assigned guessed domains by the migration; add or verify those deliberately.

## Current DNS findings (read-only audit, July 29, 2026)

- `upnexx.net` uses GoDaddy nameservers `ns01.domaincontrol.com` and `ns02.domaincontrol.com`.
- The apex resolved to `216.150.1.1`; `www` was a CNAME to the apex.
- `app.upnexx.net`, `aiatwork.upnexx.net`, and a random wildcard probe did not resolve. Wildcard DNS is therefore not active.
- No nameservers or DNS records were changed by this work.

Before changing DNS, export or record every existing GoDaddy DNS entry, especially MX, TXT, DKIM, SPF, and verification records.

## Vercel and GoDaddy setup

1. In the production Vercel project, open Settings → Domains and add `*.upnexx.net`.
2. Use the exact DNS values Vercel shows for that project.
3. To retain GoDaddy nameservers, follow Vercel's external-DNS wildcard procedure. It normally requires a wildcard CNAME `*` pointing to `cname.vercel-dns-0.com` and delegation of `_acme-challenge` to Vercel's displayed nameservers so Vercel can issue wildcard TLS certificates.
4. Do not replace the apex nameservers unless all DNS records have been audited and recreated. A nameserver switch affects email and every other DNS service.
5. Verify `https://a-real-tenant.upnexx.net` resolves, receives a valid certificate, displays that tenant, and does not expose another tenant.
6. Only after that verification, set `TENANT_SUBDOMAINS_ENABLED=true` in Vercel.

For local testing, set `NEXT_PUBLIC_ROOT_DOMAIN=localhost` and open `http://tenant-slug.localhost:3000`.

## Supabase Auth settings

In Authentication → URL Configuration:

- Keep the canonical production Site URL.
- Add `https://*.upnexx.net/**` to the allowed redirect URLs.
- Keep the central production callback URLs during the transition.
- Add localhost callback URLs only for development.

Supabase supports wildcard redirect patterns, but recommends exact production redirects where practical. Test invitation acceptance, sign-in, password reset, and sign-out from an actual tenant hostname.

## Stripe platform setup

Configure these server-only Vercel environment variables:

```text
STRIPE_SECRET_KEY=...
STRIPE_CONNECT_WEBHOOK_SECRET=...
STRIPE_PLATFORM_FEE_BPS=500
```

`500` is an example 5% application fee; use the approved UpNexx fee. Do not put secret values in `NEXT_PUBLIC_*` variables.

In Stripe:

1. Enable Connect for the UpNexx platform account.
2. Confirm the platform profile and branding required by Stripe.
3. Add `https://<production-host>/api/webhooks/stripe-connect` as a Connect webhook.
4. Subscribe it to `account.updated`.
5. Copy that endpoint's signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.
6. Test onboarding return and refresh flows in Stripe test mode before using live keys.

Disconnecting in UpNexx disables tenant payments locally; it does not delete the external Stripe account. Paid checkout must always re-check payment readiness server-side before creating a charge.

## Activation and verification checklist

- Migration 0013 succeeds.
- Vercel build succeeds with no TypeScript errors.
- Wildcard DNS and TLS work for two different tenant slugs.
- Each hostname shows only its matching tenant.
- Cross-tenant dashboard/API requests are denied.
- Invitation, login, reset, and logout return to the correct tenant.
- A tenant can operate free plans while Stripe says `Not connected`.
- A paid plan requested as active is stored as an inactive draft before Stripe.
- Stripe onboarding can be started, abandoned, resumed, and completed.
- `account.updated` changes the UpNexx status.
- A paid plan becomes publishable only when charges, capability, and platform fee checks all pass.

Production subdomain verification and live Stripe onboarding remain external operator steps because this environment has no Vercel token, Stripe secret, or wildcard DNS. Do not call the production rollout complete until those checks pass.
