# Supabase setup

1. Create separate Supabase projects for development, staging, and production.
2. Enable email/password authentication and configure redirect URLs.
3. Apply `0001_initial.sql`, then `0002_podcastos_multitenant.sql` in staging.
4. Create a private `tenant-assets` Storage bucket.
5. Copy the project URL and anonymous key into `.env.local`.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.
7. Generate database types with the Supabase CLI and replace the placeholder in `lib/supabase/database.types.ts`.
8. Set server-controlled `app_metadata.platform_role` only through a trusted administration process.
9. Create test users for every role and exercise all RLS policies before production.
10. Run `supabase/migrations/0006_subscription_membership_ai_foundation.sql` to enable tenant types, platform subscriptions, audience plan entitlements, AI credits, and phased AI feature tables.

Required browser-safe variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ROOT_DOMAIN=
```

Server-only variables include the Supabase service role, Stripe secrets, encryption key, and email provider key.

The current schema migration has not been applied to or tested against a live Supabase project in this workspace.
