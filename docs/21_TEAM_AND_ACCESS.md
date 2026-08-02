# Team & Access

Migrations `0018_platform_tenant_team_access.sql`,
`0019_tenant_owner_team_invitations.sql`, and
`0020_team_permissions_and_access_history.sql` are required before using the platform
Team & Access and tenant Team & Owners screens. Apply them in development and
staging before any production approval.

## Access boundaries

Platform access and tenant access are independent:

- Platform membership is stored in `platform_memberships` and grants only
  permissions assigned through `platform_role_permissions`.
- Tenant membership remains stored in `tenant_memberships`, always carries a
  tenant ID, and never grants platform access.
- Trusted platform mutations use the Supabase service-role client only after a
  server-side permission check.
- Platform membership and invitation tables expose no browser write policy.
- Tenant team mutations resolve the authenticated user's active tenant and add
  that tenant ID to every query.
- `PLATFORM_SUPERADMIN_EMAILS` remains the server-side emergency bootstrap
  allowlist. It does not create a database super-admin role.

## Platform roles

| Role | Intended access |
| --- | --- |
| Platform Owner | All platform permissions, including granting ownership |
| Platform Administrator | Platform operations except granting ownership |
| Platform Support | Tenant visibility and support operations |
| Platform Billing Administrator | Tenant visibility and platform billing |
| Platform Content Administrator | Tenant visibility and platform content/legal |
| Platform Analyst | Tenant visibility, analytics, and audit history |
| Platform Developer | Tenant visibility, settings, audit, and integrations |

The executable mapping is seeded in `platform_role_permissions`. Route handlers
must call `getPlatformAdministrator(requiredPermission)` rather than compare a
role name.

The final active Platform Owner is protected by a database trigger. The API also
blocks self-role changes, self-suspension/removal, unauthorized ownership
grants, and critical changes without a recent sign-in.

## Tenant roles

Tenant Owner, Tenant Administrator, Billing Administrator, Communications
Manager, Content Manager, Support Manager, Analyst, Contributor, and Viewer are
defined in `tenant_role_definitions`. Their initial permissions are stored in
`tenant_role_permissions`. The pre-existing `tenant_roles` tenant/user
assignment table is preserved for migration compatibility; `tenant_memberships`
remains the active authorization source. Legacy role values remain accepted for
existing records but are no longer offered for new invitations.

The final active Tenant Owner is protected by a database trigger. Tenant Team
visibility and actions are resolved from `tenant_role_permissions`; the initial
catalog grants management permissions to Tenant Owners and Tenant Administrators.
Platform users with `platform.tenants.manage` can use a tenant's detail
screen to invite an initial, additional, or replacement Tenant Owner and any
supported tenant staff role. Adding a new owner does not silently demote an
existing owner.

## Invitation security

- Tokens are generated with cryptographic randomness and only SHA-256 hashes
  are stored.
- Tokens are single-use and acceptance is performed inside a row-locking RPC.
- Expired, revoked, accepted, and mismatched-email invitations are rejected.
- Resend rotates the token; neither platform nor tenant APIs return raw links.
- Invitation attempts and resends are hourly rate-limited.
- `INVITATION_EXPIRATION_DAYS` configures expiry from 1 through 30 days and
  defaults to 7.
- New and existing accounts receive the branded invitation through the verified
  tenant or UpNexx Resend sender. New recipients create an account from the
  invitation acceptance page before consuming the single-use invitation.

## Required environment variables

Values must be configured separately in each environment and must never be
committed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `PLATFORM_SUPERADMIN_EMAILS`
- `PLATFORM_RESEND_API_KEY`
- `PLATFORM_INVITATION_FROM_EMAIL`
- `PLATFORM_INVITATION_FROM_NAME`
- `INVITATION_EXPIRATION_DAYS`

Tenant Resend provider credentials may also be configured through the existing
Communication Hub. The platform sender is the secure fallback.

## Manual staging checklist

1. Apply migrations through 0020 to the staging Supabase project.
2. Confirm at least one active Platform Owner exists or bootstrap one with the
   staging-only `PLATFORM_SUPERADMIN_EMAILS` allowlist.
3. Verify RLS as an unauthenticated user, tenant-only user, suspended platform
   user, and each platform role.
4. Invite a new Platform Administrator and accept using the invited email.
5. Invite an existing account and confirm the Resend-branded message arrives.
6. Resend an invitation and confirm the old link fails and the new link works.
7. Revoke and expire invitations and confirm acceptance fails.
8. Confirm a Platform Administrator cannot grant Platform Owner.
9. Confirm self-role changes and removal of the final owner fail.
10. Suspend a platform user and verify the next protected request is denied;
    reactivate and verify access returns.
11. From Tenant A, invite and manage all supported tenant roles. Confirm no
    Tenant B membership or invitation can be read or changed.
12. Open a tenant without an owner in Platform Admin, invite a Tenant Owner,
    accept the invitation, and confirm the owner appears without removing any
    other active owner.
13. Confirm invitation, role, suspension, restoration, removal, and acceptance
    events appear in access history and `audit_logs`.
14. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and
    the authenticated Playwright staging suite before release approval.

No Stripe configuration is changed by Team & Access migration 0018.
