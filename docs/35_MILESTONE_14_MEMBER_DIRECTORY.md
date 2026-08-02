# Milestone 14 — Member Directory

Milestone 14 completes audience-member operations for the combined production release. It does not create or use a staging deployment.

## Delivered

- A searchable audience directory separated from tenant Team administration, with status and lifecycle filters.
- Secure member and guest invitations using the existing single-use invitation and tenant/platform email-delivery workflow.
- Tenant-specific preferred name, job title, organization, phone, location, time zone, bio, source, and lifecycle profile data.
- Active, inactive, and suspended access controls limited to audience roles.
- Manual or complimentary membership-plan assignment with explicit assignment provenance and separate plan-management permission checks.
- Tenant member tags, atomic tag/group assignments, and communication-group integration.
- Private manager-only member notes with deletion controls.
- RLS and database relationship validation for profiles, tags, assignments, notes, and group membership.
- Trial mutation enforcement, invitation rate limits, tenant scoping, and audit records for audience operations.

## Required migration

Run `supabase/migrations/0030_member_directory.sql` after `0029` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0030` checks report `PASS`.
