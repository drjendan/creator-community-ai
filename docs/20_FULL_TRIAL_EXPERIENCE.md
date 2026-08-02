# Full trial experience

Migration `0017_full_trial_experience.sql` is required before deploying the
matching application code.

Active trials receive all standard feature entitlements regardless of the
tenant's previous plan-entitlement rows. The dashboard header and global trial
banner display the subscription type, start and end dates, and server-derived
days remaining.

When the end timestamp passes, the first authenticated server request
synchronizes the subscription to `expired_trial` and records an `expired`
history and audit event. Existing data is retained and remains readable.
Content mutations, AI generation, campaign creation/delivery, uploads, and team
invitations are rejected. Billing and Support remain available.

Platform administrators manage a trial from **Platform Admin → Tenants → Tenant
Details**. They can extend it with a reason, end it early, convert it to an
active plan, and review its immutable event history. These operations populate
both `trial_history` and `audit_logs`.
