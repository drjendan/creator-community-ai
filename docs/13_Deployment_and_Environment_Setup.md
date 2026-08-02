# 13 — Deployment and Environment Setup

**Status:** In Review
**Last Updated:** 2026-07-31
**Production deployment:** Vercel at `upnexx.net`; no deployment performed by this change

## Local setup

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:3000`. Do not run the production build while the development server is using `.next`.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `APP_ENV` | Server | `development`, `preview`, `staging`, `production`, or `test` |
| `NEXT_PUBLIC_APP_URL` | Public | Exact application origin |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Public | Hosted tenant-domain resolution |
| `CUSTOM_DOMAIN_CNAME_TARGET` | Server | Exact production hostname tenants target with CNAME records |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Environment-specific Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | RLS-bound anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Trusted administrative workflows |
| `APP_ENCRYPTION_KEY` | Server secret | Encrypt tenant AI provider credentials |
| `RESEND_API_KEY`, `EMAIL_FROM` | Server | Transactional email |
| `RESEND_WEBHOOK_SECRET` | Server secret | Signed Resend webhook verification |
| `COMMUNICATION_SIGNING_SECRET` | Server secret | Communication preference links |
| `STRIPE_BILLING_ENABLED` | Server config | Keep `false` until the deferred production integration is fully validated |
| Stripe keys, OAuth client/state secrets, webhook secrets, and fee basis points | Server secrets | Required only when Stripe billing is explicitly enabled |

Never commit values. The combined release goes directly to production after all milestones are complete; it does not use a staging promotion. Production must not use test Stripe keys or Prices.

## Supabase

1. Select the correct environment-specific project.
2. Apply migrations `0001` through `0040` in order.
3. Verify tables, functions, triggers, RLS policies, indexes, and storage policies.
4. Configure exact local, preview, and production authentication redirects.
5. Run the tenant-isolation matrix before the production release.

Do not expose the service-role key to browser code. Migrations are validated locally and applied to production only during the approved combined release.

## Vercel environments and domains

- `main` is the production source for `upnexx.net`.
- Feature branches create preview deployments with non-production resources.
- The combined production push requires successful checks and explicit approval after all milestones are complete.

Set variables separately for Preview and Production. The health probe is `GET /api/health`; it reports only the environment label, named check statuses, and a correlation ID. Responses carry `x-correlation-id` for traceability.

Custom domains use a strict production lifecycle: tenant request, TXT ownership challenge, live route verification, hosting-provider certificate issuance, recorded SSL evidence, platform activation, canonical redirect validation, rollback rehearsal, then reactivation. Configuration alone never marks a check passed. Keep the managed `{tenant}.upnexx.net` hostname available as the rollback route. See [Milestone 23](44_MILESTONE_23_CUSTOM_DOMAINS.md).

## Vendor status

- **Stripe:** production billing code is implemented but deferred for the initial release. Set `STRIPE_BILLING_ENABLED=false`; checkout, portals, Connect, callbacks, webhooks, and paid-membership actions remain fail-closed until a later approved integration release.
- **Resend:** communication routes and signed webhook handling exist; use separate environment keys, senders, recipient safeguards, and webhook secrets.
- **AI providers:** tenant-owned credentials are entered under Workspace Settings → AI Providers and encrypted server-side.
- **Monitoring:** structured application logs are present. External error tracking and analytics remain unconfigured.

## Release checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run release:preflight
```

The preflight must run from the clean committed release source. Its commit SHA and artifact SHA-256 are entered in Platform Admin → Production Releases. A dirty-worktree override is for local validation only and must never be used as approval evidence.

After the combined release, validate migrations, tenant isolation, webhook signatures, email safeguards, authentication redirects, mobile navigation, error recovery, and `/api/health` in production.

## Rollback and recovery

- Retain the previous Vercel deployment for immediate application rollback.
- Prefer additive, backward-compatible migrations and a forward corrective migration over destructive rollback SQL.
- Record the deployed commit, migration set, environment changes, validation owner, and approval.
- After rollback, smoke test landing, authentication, tenant routing, content, support, AI, email, and billing access if enabled.
- Verify Supabase backups and restoration procedures separately; configuration is not a backup.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Health returns 503/configuration failed | Required variable names in the correct Vercel scope; no values are returned |
| Health returns 503/database failed | Supabase URL/key pairing, reachability, RLS access, and project status |
| Login fetch failure | Supabase reachability and authentication redirect configuration |
| Tenant missing | Domain/slug record, membership, resolver order, and applied migrations |
| Content schema error | Migration order and Supabase schema cache |
| AI credential error | Stable encryption key and server-only configuration |

## Remaining operator decisions

- Confirm the Vercel production branch in the Vercel UI.
- Confirm DNS ownership and production wildcard-domain targets.
- Assign deployment, rollback, incident, RPO, and RTO authority.
- Validate production variable scope without disclosing values.

Related: [GitHub/Vercel handoff](17_GitHub_Vercel_Deployment_Handoff.md), [Security](12_Security_and_Privacy.md), [Milestone 1 report](22_MILESTONE_1_STABILITY_NAVIGATION.md).
