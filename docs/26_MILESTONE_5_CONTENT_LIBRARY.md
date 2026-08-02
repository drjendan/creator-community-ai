# Milestone 5 — Content Library Consolidation

**Status:** Implementation complete; production migration and combined application deployment pending

**Completed:** 2026-07-31
**Release model:** Complete all milestones locally, then deploy the combined application release directly to production. No staging environment is used.

## Scope

Milestone 5 turns Content Library into a real cross-content workspace instead of a renamed Resources page.

Tenant administrators can search and filter episodes, courses, resources, and events in one place; inspect status and access levels; open each specialized editor; and assign reusable categories across content types. Resource authoring remains available as a specialized editor under Resources.

The member Content Library consolidates all published content visible under the existing RLS and entitlement rules. It supports search, content-type filtering, and category filtering. Public visitors and authenticated members receive only content already authorized by the underlying episode, course, resource, and event policies.

## Migration 0021

`0021_content_library_consolidation.sql` adds tenant-scoped `content_category_assignments`, validates that the category and content belong to the same tenant, enforces category/content-type compatibility, removes assignments after content deletion, and provides an atomic assignment-replacement function.

Browser clients receive select-only RLS for safe category metadata. Assignment writes are possible only through the function after `tenant.content.manage` is resolved from the database.

Trusted service-role calls remain available only after the application performs its server-side permission check, which preserves Platform Owner/Administrator tenant-management workflows.

Apply `0021` after `0020` before the combined application release.

## Production validation

- [x] Lint passed with no warnings or errors.
- [x] TypeScript passed.
- [x] 114 unit/integration tests passed across 25 files.
- [x] Production build passed and generated 76 routes, including both unified Content Library routes and the tenant API.
- [x] The browser runner executed all 32 desktop/mobile scenarios with no reported assertion failure; six credential-dependent scenarios were skipped. The command then reached the repository's known Windows web-server teardown timeout.
- [ ] Back up production and apply migration `0021` after `0020`.
- [ ] Run `supabase/verify_upnexx_schema.sql` and confirm every `0021` requirement passes.
- [ ] Confirm categories can be assigned to compatible tenant content and incompatible/cross-tenant assignments fail.
- [ ] Confirm Tenant A cannot read or mutate Tenant B assignments.
- [ ] Verify public, member, paid-member, content-manager, and viewer library results against existing RLS expectations.
- [ ] Confirm deleting content removes its category assignments.
- [ ] Verify zero-data, search, type, category, status, mobile, and keyboard states.

## Rollback

The application can be rolled back before the database because `0021` is additive. Database rollback should use a reviewed forward migration; dropping assignments would discard tenant organization data.
