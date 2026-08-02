# Milestone 20 — Transactional Notification Reliability

Milestone 20 makes invitation and access-change email delivery durable for the combined production release. It does not create or use staging.

## Delivered

- A durable transactional-delivery ledger created before provider submission.
- AES-256-GCM encrypted message payloads using the server-only application encryption key.
- Privacy-minimized operator evidence using recipient hashes and masked hints; tokens and message bodies are not exposed.
- Idempotent initial invitation delivery and distinct reminder delivery attempts.
- Atomic batch claiming with `SKIP LOCKED`, stale-processing recovery, exponential backoff, and bounded attempts.
- Cron processing alongside scheduled Communication Hub work.
- Automatic tenant/platform invitation reconciliation when a queued retry is accepted.
- Platform Operational Readiness visibility for delivery status, attempts, masked recipients, and safe errors.
- Authorized, audited manual retry for terminal failures.
- No delete policy for delivery evidence.

Provider acceptance is not inbox delivery. Production Resend credentials, verified sending domains, DNS records, webhook delivery evidence, and alert ownership remain operator gates and must not be marked passed without real evidence.

## Required migration

Run `supabase/migrations/0036_transactional_notification_reliability.sql` after `0035`, then run `supabase/verify_upnexx_schema.sql` and confirm all `0036` checks report `PASS`.
