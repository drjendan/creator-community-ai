# Milestone 2 — Platform Team, Tenant Team, Roles, Invitations, and Permissions

**Status:** Implementation and production database migration complete; combined application deployment pending
**Completed:** 2026-07-31
**Production deployment:** Not performed
**Production migration:** `0020` applied successfully on 2026-07-31

## Audit summary

Migrations 0018 and 0019 already supplied separate platform memberships and invitations, fixed role catalogs, hashed single-use tokens, acceptance RPCs, final-owner triggers, access history for platform users, tenant-team screens, and Resend invitation delivery. The focused baseline passed 22 existing tests.

The audit found that tenant runtime authorization and navigation still depended partly on hardcoded role/label checks. The tenant permission vocabulary was coarser than the approved product permissions, tenant access changes lacked a dedicated history table, and successful access mutations did not tell administrators when a follow-up notification email failed.

The implementation reuses all working membership, invitation, acceptance, audit, and final-owner behavior. It does not replace or delete existing records.

## Changed files and objects

Runtime and UI changes are in `lib/permissions.ts`, `lib/tenant-context.ts`, `lib/navigation.ts`, tenant/platform team API routes, invitation acceptance, dashboard navigation, and the three team-management components. Regression coverage is in `tests/team-access.test.ts`, `tests/team-permissions.test.ts`, and `e2e/podcastos.spec.ts`.

Migration `0020_team_permissions_and_access_history.sql`:

- expands `platform_permissions` and `platform_role_permissions`;
- expands `tenant_permissions` and `tenant_role_permissions`;
- preserves legacy assigned roles as inactive catalog entries;
- adds `has_tenant_permission(uuid,text)`;
- adds tenant-scoped `tenant_access_history`, indexes, and select-only RLS;
- adds no browser write policy.

No Stripe table, price, product, webhook, or configuration is changed.

## Authorization behavior

- Tenant navigation is filtered from permission metadata rather than role-name labels.
- Tenant Team GET, invite, role, suspend, remove, resend, and revoke operations require their specific server-side permission.
- Permission changes are loaded from `tenant_role_permissions`, so changes take effect on the next protected request.
- Platform authorization continues to load `platform_role_permissions` from the database.
- Tenant and platform membership remain independent.
- Suspended/removed memberships fail active-membership checks.
- The final active Platform Owner and Tenant Owner triggers remain unchanged.
- Invitation tokens remain hashed, rotating, time-limited, single-use, and email-bound.
- Access changes continue even if a notification provider is unavailable, but the administrator now receives an explicit warning.

## Migration and rollback

Apply migration 0020 only after migrations 0001–0019. It is additive and preserves all existing memberships, invitations, and audit records.

Rollback should normally be a forward corrective migration. If application rollback occurs before database rollback, the added permission rows/table are backward-compatible. Dropping `tenant_access_history` or permission rows would discard audit/configuration data and should not be done without a reviewed retention decision.

## Validation results

- Focused baseline: 22/22 tests passed.
- Intermediate permission/security suite: 31/31 tests passed.
- TypeScript passed after permission and UI integration.
- Final lint, TypeScript, full unit/integration, build, and Playwright results are recorded in the handoff after execution.
- Supabase CLI is not installed locally; live migration execution is a manual development/staging step.

## Known issues and deferred work

- Real Resend delivery and bounce/failure behavior require production provider validation after the combined release.
- Authenticated role-by-role browser tests require controlled production accounts.
- No custom-role builder is included; Milestone 2 uses the approved fixed role catalogs.
- Platform/tenant hub analytics remain Milestone 3.
- Stripe remains deferred and untouched.

## Production validation checklist

- [x] Apply migration 0020 after 0019 in production.
- [ ] Run `supabase/verify_upnexx_schema.sql` against production and confirm every 0020 row passes.
- [ ] Test each platform role against its expected navigation and API permissions.
- [ ] Test each tenant role against its expected navigation and API permissions.
- [ ] Confirm Tenant A cannot read or mutate Tenant B memberships, invitations, or access history.
- [ ] Invite new and existing accounts to platform and tenant roles through Resend.
- [ ] Confirm resend invalidates the old token and revoke/expire/accept prevents reuse.
- [ ] Confirm email mismatch cannot accept an invitation.
- [ ] Confirm role, suspend, restore, remove, invite, resend, revoke, and accept events appear in access history and `audit_logs`.
- [ ] Confirm notification-provider failure produces a visible warning without rolling back the authorized access change.
- [ ] Confirm the final active Platform Owner and Tenant Owner cannot be demoted, suspended, or removed.
- [ ] Confirm users cannot change their own protected role or elevate themselves.
- [ ] Confirm suspended access is rejected on the next protected request.
- [ ] After all milestones are complete and the combined application release is deployed, run authenticated Playwright tests at desktop and mobile sizes.
