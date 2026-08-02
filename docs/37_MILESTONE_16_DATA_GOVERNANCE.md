# Milestone 16 — Data Governance and Rights

Milestone 16 completes the authenticated data-rights and tenant governance baseline for the combined production release. It does not create or use a staging deployment.

## Delivered

- Member-generated JSON exports containing only records readable through that signed-in member's tenant-scoped RLS session.
- Export coverage for account/profile, membership, subscriptions, learning progress, events, bookmarks, recommendations, and communication preferences.
- Correction and member-account closure requests with status history and explicit review language.
- No automatic destructive deletion: billing, audit, security, contractual, or legal retention requirements must be reviewed before closure.
- A tenant-owner/administrator `tenant.data.manage` permission for the governance queue.
- Reviewed, completed, and denied resolution states with resolution notes and audit events.
- Tenant-scoped CSV audit export capped at 5,000 events, with every export itself audited.
- Removal of general member access to operational audit logs.
- Request relationship validation, open-request deduplication, request rate limits, and tenant-scoped RLS.

This milestone supplies application workflow and evidence handling. It does not decide statutory retention periods, perform legal analysis, delete identity-provider accounts, cancel paid services, or replace an approved privacy/incident process.

## Required migration

Run `supabase/migrations/0032_data_governance_rights.sql` after `0031` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0032` checks report `PASS`.
