# Milestone 6 — Production Billing

**Status:** Completed locally; integration deferred and disabled for the initial production release

**Migration:** `0022_production_billing.sql` — required after `0021`
**Deployment:** None performed; no staging promotion

## Outcome

Milestone 6 completes the application-side billing boundary for UpNexx platform subscriptions and tenant-owned audience memberships. Platform billing managers configure live platform Price IDs. Tenant billing managers connect Stripe Standard accounts through signed OAuth, publish synchronized membership Prices, and receive direct charges with the approved UpNexx application fee.

Member and tenant access never becomes active from a browser redirect alone. Signed, idempotent subscription and invoice webhooks own billing state. Billing recovery only reverses suspensions created by billing automation, preserving manual and policy suspensions.

## Delivered

- Stripe Standard OAuth with HMAC-signed, expiring, tenant/user-bound state and deauthorization.
- Permission-gated tenant Connect management and platform Price configuration.
- Platform subscription Checkout and Billing Portal sessions.
- Connected-account membership Checkout and Billing Portal sessions.
- Connected-account product and recurring Price synchronization for paid membership plans.
- Separate signed platform and Connect webhooks with raw-body verification, event-ID deduplication, processing status, and bounded error storage.
- Subscription, invoice, payment, cancellation, trial, and application-fee state fields.
- Audited platform Price changes and tenant Stripe connection changes.
- Production-required Stripe environment validation.

## Security and integrity invariants

- Stripe secrets and state keys are server-only.
- Checkout queries active, tenant-scoped plans server-side; clients cannot supply arbitrary Price IDs or fees.
- Paid plans remain inactive when connected-account Price synchronization fails.
- Checkout completion records `incomplete`; invoice/subscription events establish active state.
- A duplicate provider event returns success without applying its mutation twice.
- Payment uniqueness is enforced per tenant and Stripe invoice.
- Only `billing:*` suspensions can be automatically recovered by a good subscription state.
- Financial reporting must be reconciled to Stripe; application subscription rows are operational state, not an accounting ledger.

## Required production migration

Apply `supabase/migrations/0022_production_billing.sql` once, after the already-applied `0021`. Then run `supabase/verify_upnexx_schema.sql` and confirm all `0022` checks report `PASS`.

The migration is additive. If application rollback is required, retain the new columns and indexes and restore the prior application deployment. Use a forward corrective migration for database changes.

## Production configuration checklist

For the initial production release, set `STRIPE_BILLING_ENABLED=false`. This removes Stripe secrets from health requirements, hides payment actions, blocks checkout and Connect routes, and leaves free memberships available. The steps below apply only to the later Stripe enablement release.

1. Set `STRIPE_BILLING_ENABLED=true` together with `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_STATE_SECRET`, and `STRIPE_PLATFORM_FEE_BPS` using approved live values.
2. Register the production Standard OAuth callback `/api/stripe/connect/callback`.
3. Configure `/api/webhooks/stripe-platform` for platform checkout, subscription, and invoice events.
4. Configure `/api/webhooks/stripe-connect` for account/deauthorization plus connected-account checkout, subscription, and invoice events.
5. Enter the live monthly/annual Price IDs under Platform Admin → Billing.
6. Verify a controlled platform purchase, connected membership purchase, invoice success/failure, cancellation, portal return, Connect disconnect, and webhook replay.
7. Confirm `/api/health`, authentication, tenant isolation, and the complete release smoke suite after the single production push.

## Validation

- `npm.cmd test`: 120 passed across 26 files.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with no warnings or errors.
- `npm.cmd run build`: passed; 80 pages generated and all billing routes compiled.
- Playwright: all 26 executable browser scenarios passed and 6 credential-dependent scenarios skipped. The Windows process then hit the 120-second wrapper timeout during the known web-server teardown hang; there were no assertion failures.
- `git diff --check`: passed (line-ending notices only).

## Rollback

- Restore the retained prior Vercel production deployment.
- Disable the two Stripe webhook endpoints or roll their secrets if event delivery must stop.
- Disable affected live Prices in Stripe to stop new checkout without deleting billing history.
- Do not delete connected accounts, subscriptions, invoices, payments, or migration columns as part of emergency rollback.
