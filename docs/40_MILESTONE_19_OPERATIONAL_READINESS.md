# Milestone 19 — Operational Readiness

Milestone 19 adds application-side production evidence controls. It is part of the single combined production release. There is no staging promotion.

## Delivered

- A permission-gated Operational Readiness console for platform audit readers.
- A dedicated `platform.operations.manage` permission limited to platform owners and administrators.
- Live, non-destructive configuration, database, and Storage connectivity diagnostics.
- Explicit production release gates seeded as `pending`; no check is inferred or fabricated as passed.
- Evidence references, review notes, verifier identity, and timestamps for every non-pending gate.
- Append-only database, Storage, and restore verification history with measured RPO/RTO observations.
- Incident, backup, and recovery ownership plus approved RPO/RTO recording without storing provider secrets.
- Audit-log entries for every operational setting, gate, and recovery-evidence change.
- Database constraints and triggers that reject unsupported passed or waived claims.

## Operator work that remains

The console records evidence; it does not configure external services or perform a restore. Before the combined production release, an authorized operator must configure monitoring and backups, execute safe restore exercises, verify DNS/SSL/auth redirects/RLS/rollback, assign incident ownership, and record the resulting evidence. Even when all gates show passed, final production approval remains an operator decision.

## Required migration

Run `supabase/migrations/0035_operational_readiness.sql` after `0034`, then run `supabase/verify_upnexx_schema.sql` and confirm all `0035` checks report `PASS`.
