# Milestone 10 — Community

Milestone 10 completes member discussions and tenant moderation for the combined production release. It does not create or use a staging deployment.

## Delivered

- Accessible community space directory with featured ordering and dedicated discussion pages.
- Member discussion creation, replies, search, likes, reporting, author removal, and clear locked/pinned states.
- Space guidelines, member-or-manager posting policy, featured state, and display order.
- Moderator queue for open reports, recent discussions, and recent replies.
- Pin, unpin, lock, unlock, hide, restore, review, dismiss, and audit workflows.
- A dedicated `tenant.community.manage` permission for owners, administrators, content managers, community managers, and community moderators.
- RLS that enforces space entitlements, visible-content reads, self-authored mutations, trial restrictions, and moderation boundaries.
- Database validation prevents cross-tenant or mismatched space, post, comment, reaction, and report relationships.

## Required migration

Run `supabase/migrations/0026_community_discussions.sql` after `0025` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0026` checks report `PASS`.
