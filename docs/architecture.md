# Architecture

UpNexx uses one Next.js App Router codebase and one Vercel-compatible deployment. Server Components render content by default; small client components handle filters, navigation toggles, and form feedback.

## Layers

- `app/`: route surfaces for sales, tenant sites, dashboards, and authentication
- `components/`: reusable brand, marketing, content, form, and dashboard components
- `lib/`: tenant resolution, access control, validation, formatting, mock data, and Supabase clients
- `supabase/migrations/`: PostgreSQL schema and Row Level Security foundation
- `tests/` and `e2e/`: Vitest/RTL and Playwright coverage

Tenant identity is resolved from `/demo/[tenant-slug]`, a `{slug}.upnexx.com` host, or a custom domain. `tenant_id` is the database isolation boundary. Browser code uses only the public Supabase URL and anonymous key. The service-role key is reserved for trusted server operations and is never imported into a Client Component.

## Runtime modes

When public Supabase variables exist, middleware refreshes authentication and redirects unauthenticated dashboard requests to login. Without credentials, middleware passes through and the login page clearly identifies the experience as a mock local demo.

## Future infrastructure

Production needs billing webhooks, background jobs, email delivery, media processing, vector ingestion, observability, and a secure server-only platform-admin provisioning workflow.

