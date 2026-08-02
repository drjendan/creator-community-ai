# Tenant subdomains and Stripe Connect Standard

## Implemented boundary

- Tenant hostnames resolve to a server-controlled tenant identity and never grant tenant access by hostname alone.
- Free membership plans work without Stripe.
- Tenant billing managers connect a Stripe Standard account through signed OAuth. The callback binds state to the initiating user and tenant.
- Paid membership plans remain inactive until connected-account products and Prices synchronize successfully.
- Member checkout uses direct charges on the connected account with the configured UpNexx application fee.
- Checkout completion remains `incomplete`; signed subscription and invoice events determine paid access.
- Disconnect deauthorizes OAuth and disables payment readiness locally.

## Database

Migration `0013_tenant_domains_stripe_connect.sql` installs domains and connected-account records. Migration `0022_production_billing.sql` adds Stripe Price, checkout, invoice, and durable event-processing fields. Apply migrations in numeric order.

## Production Stripe configuration

Set these server-only production variables:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_CONNECT_STATE_SECRET=<random 32+ character secret>
STRIPE_PLATFORM_FEE_BPS=<approved fee, e.g. 500 for 5%>
```

Never use a `NEXT_PUBLIC_*` name for a secret. Register this exact production callback in Stripe Connect settings:

```text
https://<production-host>/api/stripe/connect/callback
```

Create two production webhook endpoints:

- `https://<production-host>/api/webhooks/stripe-platform`: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed` from the platform account.
- `https://<production-host>/api/webhooks/stripe-connect`: `account.updated`, `account.application.deauthorized`, and the same checkout/subscription/invoice events from connected accounts.

Use each endpoint's own signing secret. Configure live platform plan Price IDs under Platform Admin → Billing. Tenant membership Prices are created on the connected account when a paid plan is saved.

## Production-only release verification

No staging promotion is part of this release. Before the single production push:

1. Apply migration `0022` after `0021` and run `supabase/verify_upnexx_schema.sql`.
2. Configure all required live Stripe variables, callback, and both webhook endpoints.
3. Map each sellable platform plan to its live monthly and/or annual Price ID.
4. Confirm Standard OAuth connect, refresh, and disconnect with the intended production Stripe account.
5. Complete one platform subscription and one connected-account membership using controlled production transactions, then verify subscription, invoice, fee, and portal state.
6. Replay a webhook and confirm it is marked duplicate without duplicating a payment.
7. Confirm billing recovery reactivates only tenants whose suspension reason begins with `billing:`.

Application rollback uses the retained prior Vercel deployment. Migration `0022` is additive; leave its columns in place and ship a forward corrective migration if schema behavior needs correction.
