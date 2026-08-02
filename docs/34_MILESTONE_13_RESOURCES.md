# Milestone 13 — Resources

Milestone 13 completes resource authoring, versioning, discovery, and saved-resource workflows for the combined production release. It does not create or use a staging deployment.

## Delivered

- Full descriptions, author/source attribution, file format and size, current version, download control, featured state, and scheduled publication.
- Dedicated resource detail management and immutable labeled version history with release notes, status, URL, format, size, and download control.
- Member resource search, type filtering, featured indicators, metadata, detailed views, version access, and saved-resource filtering.
- Member-owned resource bookmarks with tenant, membership, publication, entitlement, and content-access enforcement.
- A dedicated `tenant.resources.manage` permission applied to navigation, content mutation, metadata, and version operations.
- RLS for published versions and bookmarks plus database validation that rejects cross-tenant resource relationships.

## Required migration

Run `supabase/migrations/0029_resource_library.sql` after `0028` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0029` checks report `PASS`.
