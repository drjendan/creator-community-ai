# Claude Code — Master Build Prompt (from Product Specification v1.0)

Paste everything below the line into Claude Code from the repo root.
It supersedes docs/CLAUDE-CODE-DAY1-PROMPT.md and docs/BUILD-PLAN.md
where they conflict; the spec wins except where this prompt overrides it.

---

You are building Creator Community AI, a white-label multi-tenant SaaS for
Nexx Jenn Technologies. Before writing any code:

1. Read CLAUDE.md (binding conventions), docs/PRODUCT-SPEC.md (the full
   product specification), and inspect the existing repo.
2. Work in the phases defined below, which follow spec §17. At the start of
   each phase, present a concrete plan (files, migrations, routes) and WAIT
   for my approval before executing. Never start the next phase without
   approval.

## Binding overrides and clarifications (these win over the spec)

- **Super-admin mechanism:** env allowlist `PLATFORM_SUPERADMIN_EMAILS`
  checked server-side with a service-role client in `lib/supabase/admin.ts`.
  No superadmin database role, no RLS bypass column. (Spec §4/§10 leaves the
  mechanism open — this closes it.)
- **Nothing tenant-specific hardcoded.** "Healing For Your Soul" and "The
  Unspoken Spaces" appear ONLY in seed files. All tenant names, podcast
  names, copy, and branding load from the database (spec §9). Grep before
  finishing each phase.
- **AI provider keys:** AES-256-GCM encryption with `APP_ENCRYPTION_KEY`
  AND a column-level REVOKE on the ciphertext column from anon/authenticated
  roles. RLS alone is insufficient (extends spec §8.3).
- **Publish-before-visible + access levels:** every content table has
  `status` (draft/published) and `access_level` (public/member/premium),
  both enforced in RLS through the chokepoint functions, never UI-only.
- **Tenant statuses:** active, trial, suspended, archived (spec §5.3).
  Suspended/archived tenants render an unavailable page publicly.
- **Migrations:** numbered files during development plus a consolidated
  idempotent `supabase/full_install.sql` updated in the same commit.
- **Media:** audio/images/PDFs to Supabase Storage in `{tenant_id}/...`
  folders with storage RLS; video is embed-URL only (YouTube/Vimeo/Loom),
  validated server-side.
- **Demo tenant:** reserved slug `demo`, seeded with full sample content,
  reset via `npm run seed:demo` and a button in /platform. Exempt from
  billing. This is in addition to the flagship seed tenant, satisfying the
  spec §10 two-tenant isolation requirement.
- **Design:** follow spec §9.1 and §14 exactly — balanced heading sizes
  (h1 caps at text-5xl), warm restrained palette, limited rounded cards,
  Fraunces + Instrument Sans already configured. No generic SaaS gradients.
- **Definition of done per phase:** `npm run typecheck` and `npm run build`
  pass; loading/empty/error states exist (spec §7.2/§7.3); README updated;
  small labeled commits.

## Phase A — Foundation (spec §17.1–17.6)

Schema fixes and expansion (one migration series + full_install.sql):
anonymous read policies for active tenants' public content; profile-creation
trigger on auth.users; role-scoped write policies through
`is_tenant_member()` and a `has_tenant_role(tenant_id, roles text[])`
companion; add `access_level` to podcast_episodes; add tenant statuses
(active/trial/suspended/archived); `audit_logs` table (service-role write).
Authentication per spec §7.2: register, email verification, login, logout,
forgot/reset password, protected routes, role-based redirect. Tenant
resolution by slug with branding loaded as CSS variables. Public tenant
homepage per spec §7.1 built from reusable components. Seed the flagship
tenant (name and podcast name in seed data only) and the demo tenant.
Verify isolation between the two tenants via direct API requests, not just UI.

## Phase B — Member experience and content modules (spec §7.3–7.8)

Member dashboard with personalized welcome, continue-learning, latest
episode, featured discussion, upcoming event, membership status, AI Coach
CTA, and useful empty states. Podcast module: library with search and
topics, episode page with audio player and/or video embed, transcript, show
notes, reflection questions, related resources; full admin CRUD with
publish/unpublish and access levels. Learning module: catalog, course page,
modules/lessons (video embed, audio, markdown text, downloadable files),
lesson completion + `lesson_progress`, progress percentage,
continue-learning; admin course builder with drag-to-reorder. Community
module: posts, comments, reactions, categories, pinned posts, moderation
(hide/delete/pin) — no DMs, no real-time. Resource library: categories,
uploads and links, search/filter, featured flag, access levels. Events:
list, detail with date/time/location/virtual link, RSVP
(`event_registrations`), replay link after the event. Admin navigation per
spec §6.3.

## Phase C — AI Coach (spec §8)

Provider abstraction in `lib/ai/` supporting OpenAI, Anthropic, and Google
Gemini; implement OpenAI fully first, then extend the abstraction to the
other two. `ai_provider_settings` per tenant: provider, model, encrypted
key (per override above), system prompt, tone/persona, disclaimer text,
quotas, citation settings, excluded categories, enabled flag.
`ai_knowledge_sources`: tenant-approved sources selected from transcripts,
lessons, and resources, indexed with Postgres full-text search (no vector
DB for MVP). Retrieval: search ONLY the active tenant's approved sources,
pass excerpts as context, return answers with source citations linking to
the episode/lesson/resource. Chat UI with configurable disclaimer shown
before first use, escalation language for crisis content, and a tenant
admin toggle to disable the Coach. Log conversation metadata to
`ai_conversations` without storing message content by default. Rate-limit
the endpoint per member. Cross-tenant retrieval must be impossible at the
query level — prove it in the phase summary.

## Phase D — Memberships and billing (spec §7.9, test mode)

`membership_plans` (tenant-scoped: name, description, price, interval,
entitlements as access_level mapping, stripe_price_id) and
`member_subscriptions` (status, current_period_end). Free and premium plan
structure with tenant-specific labels. Stripe test-mode checkout and
webhook (`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`) with signature verification; entitlement
enforcement in RLS via `has_active_subscription(tenant_id)` feeding the
premium access_level; membership status on the member account page.
Single platform Stripe account in test mode for MVP; the code that creates
checkout sessions must isolate account selection behind one function so
Stripe Connect can replace it later without touching callers.

## Phase E — Administration, QA, deploy (spec §17.11–17.12, §23)

Tenant admin: overview, branding editor (colors, logo, favicon, hero copy,
button labels), member management with role assignment and invites (Resend
for email), AI settings, membership plans, analytics stub (member count,
content counts, recent activity from audit_logs), tenant settings.
Platform admin at /platform: tenant list with status controls
(active/trial/suspended/archived), new-tenant wizard (validated slug with
reserved list, owner email invite, initial branding), edit tenant, user
lookup, demo-tenant reset button, audit log viewer.
Then run the full spec §23 QA checklist, fix everything it surfaces, and
prepare Netlify deployment per spec §22.2 (document env vars, Supabase
auth redirect URLs, Stripe webhook endpoint). Update README with the
checklist results.

## Out of scope — do not build (spec §15.2)

Native mobile, DMs, real-time notifications, certificates, quiz engine,
affiliates, gamification, marketplace, advanced analytics, RSS import,
email marketing automation, AI Content Studio, Zoom, referrals, SSO.
If a task seems to require one of these, stop and ask.
