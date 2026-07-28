# Database schema

Migration `0002_podcastos_multitenant.sql` adds the requested domains:

- Tenancy: tenants, domains, branding, profiles, memberships, roles, invitations
- Podcast: podcasts, episodes, guests, tags, resources, transcripts, comments
- Learning: courses, modules, lessons, resources, enrollments, progress
- Community: spaces, posts, comments, reactions
- Billing: platform plans/features, tenant subscriptions, membership plans, member subscriptions, payments, billing events
- Events: events, registrations, replays
- AI: knowledge sources, documents, chunks, conversations, messages, usage, settings
- Operations: notifications, audit logs, support requests, feature flags, usage metrics

UUID primary keys and timestamp columns are used throughout. Common indexes are generated for `tenant_id`, `user_id`, `slug`, `status`, `created_at`, and `publish_date` whenever those columns exist.

The interrupted `podcast_episodes` table from migration 0001 is preserved for migration safety. New work should use `episodes`. A production data migration should move legacy rows and retire the old table only after backup and validation.
