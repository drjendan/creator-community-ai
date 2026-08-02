# Supabase setup

1. Keep local/development data separate from the production Supabase project.
2. Enable email/password authentication and configure redirect URLs.
3. Apply migrations in numeric order to the intended project; this release is validated locally and then applied directly to production with explicit approval.
4. Create a private `tenant-assets` Storage bucket.
5. Copy the project URL and anonymous key into `.env.local`.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.
7. Generate database types with the Supabase CLI and replace the placeholder in `lib/supabase/database.types.ts`.
8. Set server-controlled `app_metadata.platform_role` only through a trusted administration process.
9. Create test users for every role and exercise all RLS policies before production.
10. Run `supabase/migrations/0006_subscription_membership_ai_foundation.sql` to enable tenant types, platform subscriptions, audience plan entitlements, AI credits, and phased AI feature tables.
11. Apply the remaining migrations in numeric order through `0040_production_release_package.sql`; migrations 0015–0040 complete the application workflows, production evidence gates, custom-domain lifecycle, and immutable production release packaging/approval history.

Required browser-safe variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ROOT_DOMAIN=
CUSTOM_DOMAIN_CNAME_TARGET=
```

Server-only variables include the Supabase service role, Stripe secrets, encryption key, and email provider key.

The current schema migration has not been applied to or tested against a live Supabase project in this workspace.
