# Milestone 18 — Protected Member Media

Milestone 18 completes protected delivery for files managed in the private `tenant-assets` bucket. It is part of the combined production release and does not create or use staging.

## Delivered

- A tenant-scoped protected-media registry with opaque identifiers, object metadata, content binding, access level, lifecycle, and relationship validation.
- Stable `/api/media/{id}` references in content records instead of seven-day storage signatures that eventually expire.
- Reauthorization on every managed-media request through the linked episode, course, event, or resource RLS policy.
- Fresh five-minute Supabase Storage signatures issued only after authorization succeeds.
- Removal of broad tenant-member reads from the private storage bucket; direct bucket access is management-only.
- Pending uploads become active only when bound to saved content. Replaced or deleted bindings are retired.
- Automatic migration of legacy `tenant-assets` signed URLs in top-level episode, course, event, and resource fields.
- Upload and media-signing abuse controls.
- Public `brand-assets` remain public because logos, favicons, and tenant presentation images must load before authentication.

Externally hosted URLs are not controlled by UpNexx Storage policies and remain the tenant operator's responsibility. Detailed attachment/version workflows should use the protected registry when managed upload controls are added to those editors.

## Required migration

Run `supabase/migrations/0034_protected_member_media.sql` after `0033`, then run `supabase/verify_upnexx_schema.sql` and confirm both `0034` checks report `PASS`.
