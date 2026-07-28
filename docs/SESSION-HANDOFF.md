# Session Handoff â€” Creator Community AI MVP

_Last updated: end of session on 2026-07-21. Pick up at **Chunk 4**._

## How we're working
Building the MVP from `docs/PRODUCT-SPEC.md` in the spec's **Â§17 recommended build
order**, one small chunk at a time: **plan â†’ your approval â†’ build â†’ commit â†’ next chunk.**

**Standing rules (always apply):**
- Nothing tenant-specific is hardcoded. Tenant/podcast/branding names come from the
  database; the flagship's real names ("Healing For Your Soul" / "The Unspoken Spaces")
  live **only in seed files**.
- Include a second **`demo`** tenant with sample content to demo the platform and verify
  tenant isolation.
- Super-admin access via **`PLATFORM_SUPERADMIN_EMAILS`** env var â€” never a DB role.
- **Skip everything in spec Â§15.2** (the exclusion list).
- After each chunk: `npm run typecheck` and `npm run build` must pass, then commit.
- Also follow `CLAUDE.md` (single RLS chokepoint via `is_tenant_member()`,
  publish-before-visible, two-layer secret encryption, consolidated `full_install.sql`,
  no static mockups once Supabase is live).

## Progress so far

| Chunk | Status | Commit |
|---|---|---|
| 1 â€” Protect the prototype (backup + git) | âœ… done | `72fff29` |
| 2 â€” Design system (tokens + UI kit) | âœ… done | `e87da92` |
| 3 â€” Public homepage (reusable components) | âœ… done | `28d6f4b` |
| 4 â€” Configure Supabase | â³ **next â€” needs your input** | â€” |
| 5 â€” Auth + profiles | pending | â€” |
| 6 â€” Multi-tenancy (resolution, roles, branding loader, RLS verify) | pending | â€” |
| 7 â€” Member dashboard | pending | â€” |
| 8 â€” Modules (podcast, learning, resources, events, community) | pending | â€” |
| 9 â€” AI Coach | pending | â€” |
| 10 â€” Membership billing (Stripe test mode) | pending | â€” |
| 11 â€” Tenant + platform admin | pending | â€” |
| 12 â€” Test + deploy (Netlify via GitHub) | pending | â€” |

Repo currently **builds and typechecks green** on branch `main`.

## What exists in the code now
- **Design system** â€” `tailwind.config.ts` (brand/accent/semantic tokens, radius, shadow),
  `components/ui/*` (Button, Card, Badge, Container, SectionHeading, Input, Textarea,
  Select, Field/Label), documented in `docs/DESIGN-SYSTEM.md`.
- **Public homepage** â€” `app/page.tsx` composes `components/marketing/*` (Header, Hero,
  FeaturedContent, CommunityPreview, UpcomingEvent, AICoachIntro, Membership, SocialProof,
  Footer). Content comes from `lib/landing-content.ts` â€” a **single typed stand-in** using a
  generic fictional tenant ("Riverstone Collective"). **This object gets replaced by real
  tenant data from Supabase in Chunk 6** â€” the components don't change.
- **Supabase helpers** â€” `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server).
  Service-role client (`lib/supabase/admin.ts`) not created yet â€” comes in Chunk 4.
- **Schema** â€” only `supabase/migrations/0001_initial.sql` exists (5 tables). The full Â§12
  data model is built in Chunk 4.

## Chunk 4 plan (what happens tomorrow)
1. Expand schema to full spec Â§12 model (courses/modules/lessons/progress, community
   posts/comments/reactions, resources, events/registrations, membership_plans/subscriptions,
   ai_provider_settings/knowledge_sources/conversations, audit_logs) â€” all `tenant_id`-scoped,
   RLS via the single `is_tenant_member()` chokepoint, publish-before-visible.
2. Create `supabase/full_install.sql` (idempotent, stands up a fresh project).
3. Add `lib/supabase/admin.ts` (server-only service-role client).
4. Wire env: create gitignored `.env.local`, update `.env.example`
   (adds `PLATFORM_SUPERADMIN_EMAILS`, `APP_ENCRYPTION_KEY`).
5. Apply + verify the schema against the live Supabase project.

### â¬… TWO DECISIONS NEEDED TO START CHUNK 4
1. **Supabase connection â€” pick one:**
   - **(A)** You already have a project â†’ paste **Project URL + anon key + service_role key**
     (Supabase â†’ Settings â†’ API). You paste them (they're secrets); `.env.local` is gitignored.
   - **(B)** No project yet â†’ I give you the ~5 clicks to create one, then you paste keys.
   - **(C)** Defer the live connection â†’ I write all migrations + `full_install.sql` + admin
     client now (committed, build stays green) and we *apply* to Supabase later.
2. **First AI provider** (used in Chunk 9): spec default is **OpenAI**. Keep OpenAI, or
   prefer Anthropic / Gemini?

## Environment notes
- Run locally: `cd C:\Users\danie\creator-community-ai` then `npm run dev` â†’ http://localhost:3000
- If `next`/`tsc` "not recognized": `node_modules` was cleared â€” run `npm install`.
- Never run a `next dev` server while a production `npm run build` runs â€” it corrupts `.next`.
  Kill node + delete `.next` before building.
- Full local backup from this session:
  `C:\Users\danie\creator-community-ai-backup-20260721-205854`
- Git identity in use: `Danielle Jennings <danniejenn@gmail.com>`. No remote configured yet.
- Approved UpNexx administrator login emails: `danniejenn@gmail.com` and
  `danielle@nexxjenntech.com`.
  (GitHub/Netlify wiring is Chunk 12).

