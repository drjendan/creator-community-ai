# Creator Community AI — SaaS Build Plan

Five phases. Each has a paste-able Claude Code prompt. Run them in order;
approve Claude Code's plan at the start of each phase before it executes.
CLAUDE.md rules apply to every phase. Definition of done for every phase:
`npm run typecheck` and `npm run build` pass, `full_install.sql` and
`seed.sql` updated, README updated, small labeled commits.

## Phase 1 — Foundation
Auth, tenant routing, RLS fixes, super-admin shell.
Use `docs/CLAUDE-CODE-DAY1-PROMPT.md` as written.

## Phase 2 — Content management (creator-facing)

**Prompt:**

Read CLAUDE.md. Present a plan before coding. Build tenant admin content
management for podcasts, courses, resources, and events:

1. Migration 0003: `courses` (title, slug, description, cover_image_url,
   status), `course_modules` (course_id, title, sort_order),
   `course_lessons` (module_id, title, slug, body markdown, video_embed_url,
   audio_url, sort_order, status), `resources` (title, description,
   file_url or link_url, status), `events` (title, description, starts_at,
   ends_at, location_or_url, status), `event_rsvps` (event_id, user_id).
   All tenant-scoped, publish-before-visible RLS through the existing
   chokepoint functions. Update full_install.sql.
2. Supabase Storage buckets: `audio`, `images`, `resources` with per-tenant
   folder RLS (`{tenant_id}/...`). Owners/admins/content_managers write;
   reads follow content visibility.
3. Admin UI under `/{tenantSlug}/admin`: episode CRUD with audio upload
   (progress bar) and transcript field; course builder with modules and
   drag-to-reorder lessons; lesson editor with markdown body, video embed
   URL (validate YouTube/Vimeo/Loom server-side), optional audio; resources
   and events CRUD. Slugs auto-generate from titles. One-click
   publish/unpublish everywhere.
4. Member-facing pages: podcast list + episode page with audio player,
   course catalog + lesson viewer with sidebar navigation and embedded
   video, resources list, events list with RSVP.
5. Extend seed.sql so Healing For Your Soul has one full course (2 modules,
   4 lessons), 3 episodes, 2 resources, 1 upcoming event.

## Phase 3 — Super-admin tenant provisioning + demo tenant

**Prompt:**

Read CLAUDE.md. Present a plan before coding. Build platform tenant
management at `/platform` (env-allowlist protected, service-role client,
server-only):

1. Tenant list with status, member count, created date; suspend/reactivate.
2. "New tenant" wizard: name, slug (validated, reserved list includes
   `demo`, `platform`, `admin`, `api`), podcast/community name, owner email,
   initial branding colors + logo upload. On create: insert tenant +
   branding, send the owner a Supabase invite email; on first sign-in they
   land in their admin with an onboarding checklist (brand your space, add
   your first episode, create a course, invite members).
3. Edit tenant: rename, change slug (with redirect from old slug), update
   branding on behalf of tenant.
4. Demo tenant: seed script `npm run seed:demo` creates or resets tenant
   `demo` with the Phase 2 sample content set. Add a "Reset demo" button
   in /platform that runs the same logic via a server action.

## Phase 4 — Platform billing (tenants pay the platform)

**Prompt:**

Read CLAUDE.md. Present a plan before coding. Implement Layer A billing
with Stripe (single platform account):

1. Migration: `platform_subscriptions` (tenant_id, stripe_customer_id,
   stripe_subscription_id, plan, status, current_period_end). Service-role
   access only; no anon/authenticated policies.
2. Pricing config for two plans (Starter, Pro) via env-configured Stripe
   price IDs. Public pricing page at `/pricing` reading plan copy from a
   local config file.
3. Signup flow for new clients: from /pricing, collect account + desired
   community name + slug, Stripe Checkout subscription, webhook
   (`checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`) provisions the tenant using the same
   logic as the Phase 3 wizard, marks status from subscription state.
4. Stripe customer portal link in tenant admin for the owner (update card,
   cancel). Past-due/canceled sets tenant status `suspended`; suspended
   tenants render an unavailable page publicly and a "reactivate" page for
   the owner. Demo tenant is exempt from all billing checks.
5. Webhook handler verifies Stripe signatures; all Stripe code server-only.

## Phase 5 — Member subscriptions (members pay tenants, Stripe Connect)

**Prompt:**

Read CLAUDE.md. Present a plan before coding. Implement Layer B billing
with Stripe Connect (Standard accounts):

1. Migration: `tenant_stripe_accounts` (tenant_id, stripe_account_id,
   onboarded boolean), `membership_plans` (tenant_id, name, description,
   price cents, currency, interval month|year, stripe_price_id, status),
   `member_subscriptions` (tenant_id, user_id, plan_id,
   stripe_subscription_id, status, current_period_end). Secrets rules per
   CLAUDE.md #4 where applicable.
2. Tenant admin: "Payments" page with Connect onboarding link and status;
   membership plan CRUD that creates/archives Stripe products+prices on
   the connected account.
3. Member flow: join page listing plans; Checkout on the connected account
   (application fee optional, env-configured percent); webhook updates
   member_subscriptions.
4. Content gating: tenant setting per content type (free | members |
   paid). Extend RLS chokepoint with `has_active_subscription(tenant_id)`;
   gate lesson bodies, episode audio, and resource files accordingly.
   Owners/admins/content_managers and comped members always pass.
5. Member account page: current plan, invoices link, cancel via portal on
   the connected account.

## Decisions already made (override before approving, not after)

- Video = embed URLs only for now; audio/images = Supabase Storage.
- Layer A (platform revenue) ships before Layer B (member revenue).
- Stripe Connect Standard, not Express/Custom, for tenant payouts.
- Tenants are provisioned by super-admin wizard (Phase 3) and
  self-serve via paid signup (Phase 4) using shared provisioning logic.
