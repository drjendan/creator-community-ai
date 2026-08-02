# Milestone 9 — Member AI Coach

Milestone 9 adds the tenant-grounded member AI Coach to the combined production release. It does not create or use a staging deployment.

## Delivered

- Tenant-administrator configuration for Coach name, welcome text, tone, instructions, disclaimer, crisis escalation, citation behavior, retention, hourly limits, and enablement.
- Explicit approval or exclusion of published episodes, transcripts, courses, lessons, and resources.
- PostgreSQL full-text retrieval restricted to the active tenant and approved sources.
- Member chat with citations linking back to source content, clear empty/error/loading states, and a required guidance notice.
- Prompt-injection boundaries, evidence-only responses, crisis-language escalation, verified tenant provider reuse, and AI credit accounting.
- Atomic per-member hourly request limiting and tenant-scoped conversation ownership.
- Message content is not retained by default. When retention is disabled, only an empty content value, SHA-256 digest, role, citations, and operational metadata are stored.

## Required migration

Run `supabase/migrations/0025_member_ai_coach.sql` after `0024` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0025` checks report `PASS`.

Enabling the Coach also requires a verified default AI provider and at least one approved knowledge source.
