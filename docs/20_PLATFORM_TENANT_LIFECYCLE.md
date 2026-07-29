# Platform tenant lifecycle and owner invitations

## Database rollout

Apply these files in order in the Supabase SQL editor:

1. `supabase/migrations/0013_tenant_domains_stripe_connect.sql`
2. `supabase/migrations/0014_platform_tenant_lifecycle.sql`
3. Run `supabase/verify_upnexx_schema.sql`

Do not deploy the application changes until every 0013 and 0014 requirement
reports `PASS`.

## Owner invitation behavior

- Tenant creation records the original invitation timestamp, last-send timestamp,
  send count, and activation timestamp.
- Platform Admin → Tenants → Edit Tenant shows the assigned owner and invitation
  status.
- Unactivated owners can receive a new confirmation/invitation email through
  Supabase Auth and its configured SMTP provider.
- Activated owners cannot be reinvited; Platform Admin can send them a password
  reset email instead.
- Every send is server-side, rate-limited by the processing state in the UI, and
  written to `audit_logs`.

For existing tenants, `owner_invited_at` is backfilled from tenant creation time
because the historical original send timestamp was not previously stored.

## Lifecycle behavior

- `pending`: owner has not activated the newly provisioned account.
- `active`: tenant routes and APIs are available.
- `suspended`: inaccessible until reactivated; data and billing are preserved.
- `archived`: inaccessible and excluded from the normal active list until restored.
- `deleted`: inaccessible retention tombstone; excluded from the standard list.

Suspended, archived, pending, and deleted tenants are rejected by the shared
tenant-context authorization layer. Confirmed Tenant Owners automatically move a
new pending tenant to active on their first authenticated request.

## Deletion safeguards

The application deliberately does not issue `DELETE FROM tenants`: the legacy
schema applies cascading deletion to payments, billing events, audit logs,
memberships, content, and other records. A physical delete would destroy records
that may have retention requirements.

The Platform Owner-only deletion workflow:

1. Requires an explanation and exact tenant-name confirmation.
2. Blocks when provider-backed subscriptions, unsettled payments, or pending
   refunds exist.
3. Records active-user, file, and integration counts.
4. Deactivates memberships, domains, features, and AI.
5. Removes tenant AI and email provider credentials.
6. Disconnects the local Stripe Connect state when installed.
7. Writes an immutable service-role-only deletion snapshot.
8. Moves the tenant to `deleted` and preserves financial and audit history.

Deleted records are visible only to Platform Owner/Super Admin under Platform
Admin → Tenants → Deleted records.

## Manual production verification

Use non-production test users and a disposable tenant:

- Resend an unactivated owner invitation and confirm the send count increments.
- Confirm a newly sent link works and the prior confirmation link no longer works.
- Confirm an activated owner sees Password Reset instead of Resend Invitation.
- Suspend and verify tenant dashboard/API access is denied.
- Reactivate and verify access returns.
- Archive and restore.
- Confirm each operation appears in Platform Audit Logs.
- Confirm deletion is blocked separately by an active provider subscription,
  unsettled payment, and pending refund.
- Confirm Platform Admin cannot delete while Platform Owner can.
- Delete an eligible disposable tenant and verify it appears only in Deleted
  records.
- Confirm a second tenant remains unaffected throughout the test.
