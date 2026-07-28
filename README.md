# UpNexx

**Status:** In Review  
**Last Updated:** 2026-07-28  
**Intended Audience:** Developers, product stakeholders, operators, and contributors

**The Intelligent Content, Learning & Community Platform**

UpNexx helps knowledge-based organizations transform expertise into engagement, learning, and revenue through podcasts and media, courses, resources, events, community, memberships, and responsible AI.

UpNexx is a product of **Nexx Jenn Technologies**.

## Current status

**Development / first-customer foundation.** The repository includes the branded marketing experience, Supabase authentication, multi-tenant schema and RLS policies, role-aware administration, tenant provisioning, tenant branding, core content CRUD and storage, member media views, audience membership-plan management, encrypted tenant AI-provider credentials, creator AI generation, AI usage/credit foundations, tests, and guided onboarding.

Stripe execution, Resend delivery, production deployment, operational custom-domain provisioning, member RAG/citations, recommendations, administrator AI insights, Sentry, PostHog, and production support/recovery processes are planned or partial. See the [documentation index](docs/README.md) for evidence-based status.

## Technology

- Next.js 15 App Router, React 19, and TypeScript
- Tailwind CSS with the UpNexx design tokens
- Supabase Auth, PostgreSQL, Row Level Security, Storage, and pgvector schema
- Direct OpenAI, Anthropic, and Google provider integration for creator AI
- Vitest, Testing Library, and Playwright

Stripe, Resend, Vercel, Cloudflare, Sentry, PostHog, and Vercel AI SDK are target or recommended technologies and must not be treated as active integrations unless repository evidence changes.

## Run locally on Windows

From PowerShell:

```powershell
cd C:\Users\danie\creator-community-ai
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown. The legacy-compatible launcher also remains available:

```powershell
.\start-podcastos.cmd
```

Open `http://localhost:3000`.

The development launcher is single-instance. If UpNexx is already listening on port 3000, a second development command exits. Stop the development server before running a production build because both use `.next`.

## Environment and Supabase setup

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL, anonymous key, and required server-only values.
4. Apply SQL migrations in order through `0006_subscription_membership_ai_foundation.sql`.
5. Verify authentication redirect URLs, RLS, tenant roles, and the `tenant-assets` storage policies.
6. Start the application.

Never place real credentials in source control, documentation, screenshots, browser code, or support messages. `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY`, Stripe secrets, Resend credentials, and AI keys are server-only.

## Common commands

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:coverage
npm.cmd run test:e2e
npm.cmd run build
npm.cmd start
```

## Documentation

Start with [docs/README.md](docs/README.md). It links to the product vision, brand, architecture, database, AI, design system, roadmap, go-to-market strategy, launch checklist, onboarding, subscriptions, security, deployment, QA, glossary, and decision log.

Earlier specifications and build plans remain in `docs` as historical or detailed references. The numbered documentation set is the current navigational source of truth.

## Contribution guidance

1. Create a focused branch/change.
2. Preserve unrelated work in the repository.
3. Update relevant numbered documentation and the decision log when behavior or architecture changes.
4. Keep platform subscriptions separate from audience memberships.
5. Add or update tests for behavior, permissions, loading/error states, and accessibility.
6. Run lint, typecheck, tests, and the production build before handoff.
7. Do not deploy or change production data without explicit authorization.

## Deployment status

The application is Vercel compatible but no production deployment is documented as complete. The intended product domain is `upnexx.net`; `www`, `app`, tenant subdomains, Cloudflare DNS, SSL, preview environments, monitoring, backups, and rollback must be validated through the [deployment guide](docs/13_Deployment_and_Environment_Setup.md).

## Known limitations

- Stripe checkout, customer portal, signed webhooks, and audience-payment operations are not implemented.
- Resend invitations/notifications are not implemented.
- Member AI retrieval, citations, recommendations, and administrator insights are not production features.
- Live staging RLS and cross-tenant isolation testing remains required.
- Authenticated Playwright scenarios require safe test credentials.
- Custom-domain records exist, but automated DNS verification/certificate lifecycle does not.
- Storage privacy for paid/member assets needs production review.
- Operational monitoring, rate limits, recovery objectives, legal policies, and support ownership need approval.

## Product architecture rule

A **platform subscription** is purchased by a tenant from UpNexx. An **audience membership** is offered by that tenant to its own members. They are separate commercial and authorization layers.

Powered by Nexx Jenn Technologies.
