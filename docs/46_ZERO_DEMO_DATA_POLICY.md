# Zero Demo Data Policy

**Status:** Implemented
**Scope:** Production customer workspaces, tenant provisioning, Tenant Admin, and Member experiences

## Policy

Production customer workspaces contain only real configuration and records created through authorized product workflows. UpNexx does not create sample members, memberships, courses, podcasts, episodes, products, messages, announcements, campaigns, revenue, events, resources, community activity, AI generations, or analytics.

New customer tenants initialize only the records required to operate safely: the workspace, primary domain, owner access, roles and permissions, platform subscription state, feature entitlements, workspace and AI settings, branding defaults, integration connection state, and audit history. Tenant Admins and Members create all business content organically after initialization.

## Existing production data

Migration `0041` marks all existing and future tenants as `customer` by default. Its cleanup removes only records that carry the old provisioning markers, have never been updated, and have no member subscription, campaign, or automation-run usage. Customized or referenced records are preserved as legitimate tenant data. The deleted untouched seed records require a database backup to recover after the migration commits.

## Empty experience standard

- Tenant Admin pages show zero totals and a relevant creation or setup action.
- Member pages explain that no published content exists and offer a safe navigation action or invite the member to check back.
- Analytics renders an empty chart and the message “No data available yet.” It never substitutes projected, random, or fabricated metrics.
- Missing optional descriptions are omitted instead of replaced with invented business copy.

## Dedicated demo workspace framework

Migration `0041` adds `tenants.workspace_kind` with `customer` as the default and reserves `demo` for one future dedicated workspace. Any future demo seed process must:

1. run separately from customer provisioning;
2. call the service-role-only `assert_demo_workspace_seed_boundary` guard;
3. target a tenant explicitly marked `demo`;
4. verify that tenant owns `demo.upnexx.net`;
5. label the UI as a demo workspace; and
6. never copy records into a customer tenant.

This release does not create a demo tenant or a demo seed process. The existing `/demo/[tenant-slug]` route name is a legacy member-site namespace; it is not permission to seed sample data.

## Release enforcement

The production preflight fails if the tenant provisioning action directly inserts into prohibited business-data tables. Unit tests verify the provisioning boundary, the database guard, the empty analytics state, and the absence of destructive cleanup in migration `0041`.
