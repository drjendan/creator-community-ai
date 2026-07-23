# Creator Community AI — Project Conventions

Multi-tenant, white-label community platform for podcasters, coaches, counselors,
and thought leaders. Next.js App Router + TypeScript strict + Tailwind + Supabase,
deployed on Netlify. Seed tenant: Healing For Your Soul (slug `healing-for-your-soul`).

## Architecture rules (non-negotiable)

1. **Single RLS chokepoint.** All tenant-scoped policies go through
   `public.is_tenant_member(tenant_id)` (security definer, already in
   `supabase/migrations/0001_initial.sql`). Never write per-table membership
   subqueries. If access rules change, redefine the function — every table
   inherits the change.

2. **Publish-before-visible.** Members and anonymous visitors only ever see
   rows with `status = 'published'` (episodes, lessons, resources, events).
   Draft content is admin/content_manager-only. Enforce in RLS, not just UI.

3. **Platform super-admin via env allowlist, never a database role.**
   Use `PLATFORM_SUPERADMIN_EMAILS` (comma-separated) checked server-side.
   No `is_superadmin` column, no superadmin RLS bypass in the database.
   Super-admin reads/writes use the service-role client in server-only code.

4. **Two-layer secret protection.** Any tenant API keys (AI providers, Stripe)
   are AES-256-GCM encrypted with `APP_ENCRYPTION_KEY` before storage, AND the
   ciphertext column gets a column-level `REVOKE` from the anon/authenticated
   roles. RLS alone is not sufficient for secrets.

5. **Consolidated migrations.** Keep numbered migration files during
   development, but maintain `supabase/full_install.sql` as the single
   idempotent script that stands up a fresh project. Update it in the same
   commit as any new migration.

6. **No static mockups.** Every screen reads and writes real Supabase data.
   If a feature can't be wired yet, don't build the screen.

## Code conventions

- TypeScript strict mode stays on; `npm run typecheck` must pass before any
  task is considered done. Run `npm run build` before finishing a session.
- Server components by default; `"use client"` only where interaction requires it.
- Supabase access: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts`
  (server components / route handlers). Service-role client goes in
  `lib/supabase/admin.ts` and must never be imported from client code.
- Tenant branding (colors, logo) comes from `tenant_branding` and is applied
  via CSS variables at the tenant layout level — no hardcoded tenant colors.
- Design system: Fraunces (display) + Instrument Sans (body) via `next/font`,
  brand/accent tokens in `tailwind.config.ts`. Follow the landing page's
  existing scale; h1 caps at text-5xl.

## Workflow

- Present a plan before large multi-file changes; wait for approval.
- Commit in small, labeled increments (one feature per commit).
- After schema changes: update `full_install.sql`, note the change in
  README's migration section.
- Never commit `.env.local`. `.env.example` is the source of truth for
  required variables.

## Product rules

7. **Nothing tenant-specific is hardcoded.** Tenant name, podcast name,
   logo, colors, copy, and hero content all come from `tenants` /
   `tenant_branding` / content tables. "Healing For Your Soul" and any demo
   content exist only in seed files. Grep for hardcoded tenant strings
   before finishing any phase.

8. **Two billing layers, never conflated.**
   - Layer A (platform billing): tenant owners subscribe to the platform.
     Single platform Stripe account. Tenant `status` reflects subscription
     state; suspended tenants render a "temporarily unavailable" page.
   - Layer B (member billing): members subscribe to a tenant's membership
     plans via Stripe Connect (Standard). Tenant revenue never lands in the
     platform account. Content gating checks an active subscription OR a
     comp/free membership role.

9. **Media strategy.** Audio (podcast episodes) and images upload to
   Supabase Storage in per-tenant folders (`{tenant_id}/...`) with storage
   RLS to match. Video is embed-URL only (YouTube/Vimeo/Loom) until a
   dedicated video phase is approved. Validate embeds server-side.

10. **Creator UX bar.** Admin content forms must be non-technical:
    drag-to-reorder lessons, autosave drafts, slug auto-generated from
    title, one-click publish/unpublish, upload with progress. If a creator
    needs documentation to add an episode, the form is wrong.

11. **Demo tenant.** Slug `demo` is a protected reserved tenant seeded with
    sample podcast episodes, one course, an event, and resources. A
    `npm run seed:demo` script resets it to a clean state at any time.
    The demo tenant is excluded from billing enforcement.
