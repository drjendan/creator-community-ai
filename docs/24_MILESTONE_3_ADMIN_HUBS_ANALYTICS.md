# Milestone 3 — Tenant Admin Hub and Platform Analytics

**Status:** Implementation complete; production application deployment and validation pending

**Completed:** 2026-07-31
**Release model:** Complete all milestones locally, then deploy the combined application release directly to production. No staging environment is used.

## Scope

Milestone 3 promotes the tenant dashboard to the Tenant Admin Hub and adds real operational analytics for tenant and platform administrators. Every displayed value is calculated from existing production records; the application does not insert sample metrics or forecasts.

The Tenant Admin Hub reports active members, team size, published content, upcoming events, readiness, recent audit activity, and enabled workspaces. Tenant Analytics reports membership growth, course enrollments, lesson completion and progress, event registration, community activity, email delivery, AI usage, and any existing scheduled `usage_metrics` snapshots.

Platform Analytics reports tenant state, tenant growth, active members, subscriptions, AI tokens and recorded provider cost, and open support volume. Access requires `platform.analytics.view`. Direct tenant analytics access requires `tenant.analytics.view`; hub access requires `tenant.dashboard.view`.

## Database impact

No migration is required. Milestone 3 reads tables already present through migration `0020`. It does not alter production schema or records.

## Validation

- [x] Lint passed with no warnings or errors.
- [x] TypeScript passed.
- [x] 107 unit/integration tests passed across 23 files.
- [x] Production build passed and generated 71 routes, including `/platform-admin/analytics`.
- [x] All 26 locally executable Playwright scenarios passed across desktop and mobile; six credential-dependent scenarios were skipped. The command reached the known Windows web-server teardown timeout after all listed scenarios completed.
- [ ] After the combined milestone release is deployed, verify Tenant Admin Hub values against production records.
- [ ] Verify tenant analysts can access Tenant Analytics but unauthorized tenant roles cannot.
- [ ] Verify Platform Analysts can access Platform Analytics but cannot mutate tenant, billing, or team records.
- [ ] Verify all analytics queries remain tenant-scoped and Tenant A cannot view Tenant B values.
- [ ] Verify zero-data states show zero or an honest empty state rather than sample data.
- [ ] Confirm AI cost is labeled as recorded provider cost rather than platform revenue.

## Rollback

This milestone is application-only. Roll back with the combined application deployment if required; no database rollback is needed.
