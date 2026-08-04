# UpNexx

**Status:** In Review  
**Last Updated:** 2026-07-28  
**Intended Audience:** Developers, product stakeholders, operators, and contributors

**The Intelligent Content, Learning & Community Platform**

UpNexx helps knowledge-based organizations transform expertise into engagement, learning, and revenue through podcasts and media, courses, resources, events, community, memberships, and responsible AI.

UpNexx is a product of **Nexx Jenn Technologies**.

## Current status

**Development / first-customer foundation.** The repository includes the branded marketing experience, Supabase authentication, multi-tenant schema and RLS policies, role-aware administration, tenant provisioning, tenant branding, core content CRUD and storage, member media views, audience membership-plan management, encrypted tenant AI-provider credentials, creator AI generation, AI usage/credit foundations, tests, and guided onboarding.

Stripe production billing is implemented but intentionally disabled for the initial production release; live integration and transaction validation are deferred. Durable Resend delivery boundaries are implemented, while production provider/domain activation, production deployment, operational custom-domain provisioning, advanced vector RAG, external monitoring, product analytics, and production support/recovery exercises remain operator work or partial. Explainable rules-based recommendations and qualified administrator insights are implemented. See the [documentation index](docs/README.md) for evidence-based status.

## Technology

- Next.js 15 App Router, React 19, and TypeScript
- Tailwind CSS with the UpNexx design tokens
- Supabase Auth, PostgreSQL, Row Level Security, Storage, and pgvector schema
- Direct OpenAI, Anthropic, and Google provider integration for creator AI
- Vitest, Testing Library, and Playwright

Stripe billing and Connect Standard are implemented integration boundaries. Resend, Vercel, Cloudflare, Sentry, PostHog, and Vercel AI SDK must not be treated as active integrations unless repository evidence confirms configuration.

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
4. Apply every SQL migration in order through `0044_community_launch.sql`. Migrations 0018–0044 add separate platform and tenant access controls, secure invitations and history, production billing boundaries, trusted AI and learning workflows, complete content/community experiences, governance and security controls, production-readiness evidence, isolation/quality verification, custom domains, the Zero Demo Data policy, managed-domain consistency, and public community launch workflows.
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
npm.cmd run release:preflight
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

## Production data policy

Production dashboards never display fabricated business metrics, sample tenants, fake activity, or generated chart values. Dashboard summaries are scoped to the authenticated tenant and loaded from Supabase. When records or instrumentation do not exist, UpNexx shows contextual empty states and onboarding actions instead of invented values. Platform-administrator summaries are calculated only from real platform records.

## Known limitations

- Stripe billing is deferred and must remain disabled with `STRIPE_BILLING_ENABLED=false`; enabling it later requires live credentials, webhook registration, Price mapping, and controlled production transaction verification.
- Durable Resend invitation/access notifications are implemented; production credentials, sender-domain DNS verification, webhooks, and delivery alerting require operator validation.
- Advanced vector retrieval remains pending; member recommendations and qualified administrator insights use transparent deterministic rules and require production data validation.
- Production RLS and cross-tenant isolation must be verified during the combined release.
- Authenticated Playwright scenarios require safe test credentials.
- Custom-domain requests, live DNS verification, verified-host routing, canonical redirects, certificate evidence, activation, and rollback are implemented. Hosting-provider certificate issuance and live production proof remain explicit operator actions.
- Storage privacy for paid/member assets needs production review.
- Operational evidence controls and rate limits are implemented; external monitoring, approved recovery objectives, restore exercises, legal policies, and support ownership still require operator action or approval.

## Product architecture rule

A **platform subscription** is purchased by a tenant from UpNexx. An **audience membership** is offered by that tenant to its own members. They are separate commercial and authorization layers.

Powered by Nexx Jenn Technologies.
