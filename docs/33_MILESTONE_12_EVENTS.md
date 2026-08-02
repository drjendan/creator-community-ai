# Milestone 12 — Events

Milestone 12 completes event scheduling, registration, attendance, and replay delivery for the combined production release. It does not create or use a staging deployment.

## Delivered

- Event end times, IANA time zones, online/in-person/hybrid formats, venues, addresses, capacity, registration deadlines, waitlists, member instructions, and featured state.
- Atomic member registration that serializes capacity decisions, assigns a waitlist when enabled, prevents unauthorized registration, and promotes the next waitlisted member after cancellation.
- Member upcoming/past discovery, search, localized event times, registration state, protected joining instructions, and accessible event replays.
- Tenant attendee management for confirmed, waitlisted, attended, no-show, and cancelled states.
- Tenant replay publishing with access levels, descriptions, ordering, and download controls.
- A dedicated `tenant.events.manage` permission applied consistently to event navigation, content mutations, attendance, and replay management.
- RLS and validation that restrict registration records to their owner or an event manager and reject cross-tenant event relationships.

## Required migration

Run `supabase/migrations/0028_event_experience.sql` after `0027` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0028` checks report `PASS`.
