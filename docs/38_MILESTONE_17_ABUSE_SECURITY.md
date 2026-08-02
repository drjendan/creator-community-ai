# Milestone 17 — Abuse Controls and Security Events

Milestone 17 completes the application-side abuse-control and security-event baseline for the combined production release. It does not create or use a staging deployment.

## Delivered

- Atomic PostgreSQL rate-limit windows that remain consistent across application instances.
- HMAC-SHA-256 identifiers derived from account or network identity; raw IP addresses and emails are not written to rate-limit storage.
- Fail-closed behavior when abuse-control storage is unavailable.
- Coverage for sign-in, signup, Creator AI generation, Member AI Coach, tenant/platform support mutations, and member data-rights requests.
- Existing feature-specific limits remain active as defense in depth.
- Deduplicated security events for exceeded limits, including tenant/user association where authorized, correlation IDs, severity, and bounded metadata.
- A `platform.security.manage` permission and Platform Security Events console.
- Investigating, resolved, and ignored review states with mandatory final resolution notes and audit records.
- Rate-limit window cleanup during subsequent requests.

This milestone is an application control baseline. External error monitoring, uptime monitoring, infrastructure/WAF controls, incident ownership, and production alert routing remain launch operations work.

## Required migration and secret

1. Configure `RATE_LIMIT_SECRET` as a random server-only production secret. If omitted outside production, `APP_ENCRYPTION_KEY` is used; production must have one of them.
2. Run `supabase/migrations/0033_abuse_controls_security_events.sql` after `0032`.
3. Run `supabase/verify_upnexx_schema.sql` and confirm the `0033` checks report `PASS`.
