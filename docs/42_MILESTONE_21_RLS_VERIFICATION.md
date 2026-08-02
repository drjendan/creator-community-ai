# Milestone 21 — Production RLS and Tenant-Isolation Verification

Milestone 21 provides the evidence workflow for the live production isolation gate. It is part of the combined direct-to-production release and does not create or use staging.

## Delivered

- Production-only verification runs bound to two distinct approved test tenants and a release reference.
- Automatic live database-catalog checks for tenant-table RLS, fixed `search_path` on security-definer functions, and protected Storage policies.
- Pending behavioral cases for cross-tenant reads/writes, suspended memberships, guest/public visibility, paid content, user-owned AI data, Storage paths, and platform-role boundaries.
- Evidence references, notes, verifier identity, timestamps, and immutable run relationships.
- Finalization that is blocked by pending cases and fails the complete run when any case is failed or blocked.
- Platform audit visibility and security-manager execution controls.
- Direct authenticated mutation revocation so automatic evidence cannot be rewritten from a browser client.
- Audit-log entries for run creation, behavioral results, and finalization.

## Production execution rule

Installing migration 0037 does not pass the isolation gate. After the combined code release reaches production, an authorized security operator must use two non-customer test tenants, exercise every behavioral case with dedicated accounts, attach evidence references, and finalize the run. Never place credentials, tokens, or customer content in evidence notes.

## Required migration

Run `supabase/migrations/0037_production_rls_verification.sql` after `0036`, then run `supabase/verify_upnexx_schema.sql` and confirm all `0037` installation checks report `PASS`. These installation checks confirm the harness exists; they do not claim that a production behavioral run passed.
