# Milestone 22 — Accessibility and Authenticated Critical Paths

Milestone 22 hardens shared accessibility behavior and adds production evidence for critical authenticated workflows. It belongs to the combined direct production release and does not create or use staging.

## Delivered

- A globally visible-on-focus skip link and stable application-content target.
- Polite route-change announcements and focus movement after client navigation.
- Global keyboard focus visibility for interactive elements.
- Reduced-motion behavior that disables smooth scrolling as well as animation/transition duration.
- Reusable dialog focus containment, Escape handling, accessible descriptions, and trigger-focus restoration.
- Improved tenant switcher and account-menu Escape/focus behavior.
- Expanded Playwright coverage for skip navigation, reduced motion, protected security consoles, authenticated mobile navigation, and optional dedicated platform credentials.
- A production-only quality case catalog covering keyboard, screen reader, zoom/reflow, motion, tenant-brand contrast, authenticated tenant/member/platform flows, browsers/devices, and critical defects.
- Evidence-backed quality runs that cannot finalize while pending and fail when any case is failed or blocked.
- Separate Operational Readiness gates for accessibility and authenticated critical paths.
- Platform developer/administrator execution permission and audit history.

## Production execution rule

Installing migration 0038 does not pass accessibility or authenticated-flow gates. After the combined code release reaches production, operators must run credential-backed automation and manual keyboard, assistive-technology, zoom, contrast, browser, and device reviews. Every case needs a real evidence reference; credentials and customer data must never appear in notes.

## Required migration

Run `supabase/migrations/0038_accessibility_critical_path_verification.sql` after `0037`, then run `supabase/verify_upnexx_schema.sql`. Installation checks confirm the evidence workflow exists, not that production quality has passed.
