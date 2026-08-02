# Milestone 11 — Podcast

Milestone 11 completes podcast authoring, discovery, and member learning for the combined production release. It does not create or use a staging deployment.

## Delivered

- A dedicated episode editor for show notes, season and episode numbers, duration, featured state, takeaways, reflection questions, transcript publishing, resources, and topics.
- Member discovery across titles, descriptions, show notes, and topics, with topic filters, featured indicators, cover images, media type, and duration.
- Correct audio-only and video playback with show notes, takeaways, published transcript, optional transcript download, typed resources, and reflection prompts.
- Podcast-manager permission and entitlement checks on every creator endpoint, with tenant and episode scoping on reads and writes.
- RLS for transcripts, resources, and topics that inherits the parent episode's publication schedule and content access level.
- Database validation that rejects cross-tenant transcript, resource, and topic relationships.

## Required migration

Run `supabase/migrations/0027_podcast_experience.sql` after `0026` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0027` checks report `PASS`.
