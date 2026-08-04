# Community Launch audit and implementation record

## Audit summary

- Branding is stored in `tenant_branding`; the tenant display name historically came from `tenants.name`. Both `BrandMark` and `MemberHeader` rendered either the logo or text, which caused the community name to disappear after logo upload.
- `/api/branding` is tenant-administrator protected and branding mutations are RLS protected. Existing fields cover core colors, six asset roles, welcome copy, email copy, support details, and website/footer copy.
- Middleware resolves `/demo/{slug}`, `{slug}.upnexx.net`, and verified custom domains. Tenant-host requests are internally rewritten to the legacy-compatible route. Generated links still exposed `/demo` in several views.
- Tenant invitations use hashed tokens, expiration, server authorization, RLS, and durable Resend delivery. Member enrollment is separate from lead capture.
- Platform Admin, Tenant Admin, and Member layouts already exist. Member navigation already uses Welcome, Content Library, Community → Discussions/Messages and the member header already has notifications plus permission-aware workspace switching.
- The Content Library consolidates episodes, courses, resources, events, and AI generations. It has search/filter/category assignment but lacks a general catalog record, view switching, scheduling/version actions, products, and broader content-type vocabulary.
- Creator AI Studio already uses readable tenant-scoped source dropdowns, stores source IDs internally, encrypts provider keys, records provider/usage, versions drafts, and saves drafts into the Content Library. The primary label and output/source vocabulary needed expansion.
- Membership plans, Stripe Checkout, webhooks, portal, and Connect code exist. Billing was guarded by a single legacy flag in some boundaries, but membership price synchronization could still run when a connected account existed. This milestone adds explicit fail-closed flags and preserves all integration code.
- Production demo records are prohibited by the migration-0041 policy and application helpers. No seed data is added by this milestone.

## Compatible extension

Migration 0044 extends `tenant_branding`, adds one tenant-scoped Community Settings record, share links, consent-backed leads, testimonials, and a commerce-ready product catalog. It also adds external purchase fields to existing membership plans. Existing user-created records are neither replaced nor deleted.

## Risks and deferred integrations

- Applying 0044 and running the schema verifier is required before using the new APIs.
- Slug changes affect managed domains and must be verified with DNS/canonical routing after publication.
- QR generation is local; social publishing APIs, native checkout, automated payouts, referral commissions, virus-scanner provider activation, and custom-domain automation remain deferred.
- Stripe platform billing, Connect, checkout, paid memberships, and product payments remain off unless their individual server-only flags are explicitly enabled.
- Public lead email delivery requires a configured tenant or platform Resend sender. A lead record remains the source of truth if delivery is unavailable.
