# Claude Code — Day 1 Kickoff Prompt

Paste the block below into Claude Code from the repo root. Review its plan
before approving execution.

---

Read CLAUDE.md and docs/THREE-DAY-PLAN.md, inspect the existing files, then
present a plan for Day 1 before writing any code. Day 1 scope only:

1. **Schema fixes first (migration 0002 + update full_install.sql).** The
   current RLS in 0001 is read-only and members-only, which breaks Day 1:
   - Add anonymous/public read policies so a logged-out visitor can view an
     active tenant's landing page: tenants (status = 'active'), tenant_branding
     for active tenants, and podcast_episodes where status = 'published'.
     Member-only content stays member-only.
   - Add a `handle_new_user` trigger on auth.users that inserts a profiles row.
   - Add insert/update/delete policies scoped by role: owner/admin manage
     memberships and branding; owner/admin/content_manager manage episodes.
     Route all checks through is_tenant_member or a companion
     `has_tenant_role(tenant_id, roles text[])` security-definer function —
     one chokepoint, no per-table subqueries.
   - Create `supabase/full_install.sql` consolidating 0001 + 0002 into one
     idempotent script, plus `supabase/seed.sql` creating the Healing For
     Your Soul tenant with branding and two published sample episodes.

2. **Authentication.** Email/password sign-up and sign-in pages using
   @supabase/ssr, session refresh middleware, sign-out. On first sign-in,
   membership does not exist yet — handle the "no tenant" state gracefully.

3. **Tenant-aware routing.** Route group `app/[tenantSlug]/` resolves the
   tenant by slug, 404s on unknown/suspended slugs, and applies
   tenant_branding colors as CSS variables in the tenant layout.
   Public: `/{tenantSlug}` landing with published episodes.
   Protected: `/{tenantSlug}/dashboard` (member), `/{tenantSlug}/admin`
   (owner/admin/content_manager shell with nav only — CRUD is Day 2).

4. **Platform super-admin.** `/platform` route protected server-side by the
   `PLATFORM_SUPERADMIN_EMAILS` env allowlist (add to .env.example). Lists all
   tenants with status via a service-role client in `lib/supabase/admin.ts`
   (server-only). No database superadmin role of any kind.

5. **Done means:** `npm run typecheck` and `npm run build` pass; README
   updated with exact setup steps (env vars, run full_install.sql, run
   seed.sql, create a test user, grant membership) and a Day 1 completion
   checklist. Commit in small labeled increments.

Do not start Day 2 items (CRUD forms, courses, events, community). Do not
build any screen as a static mockup.

---

After Day 1 is verified working locally, delete docs/NEXT-CODEX-PROMPT.md —
it is superseded by this file and CLAUDE.md.
