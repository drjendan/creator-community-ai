# Milestone 15 — Recommendations and Administrator Insights

Milestone 15 completes the explainable recommendation and qualified administrator-insight baseline for the combined production release. It does not create or use a staging deployment.

## Delivered

- Deterministic member recommendations built only from published content visible through that member's RLS-bound session.
- Activity-aware prioritization for joined courses and registered upcoming events, with featured and recent eligible content as additional signals.
- A visible “why recommended” explanation, dismissal, helpful/not-helpful feedback, and persisted recommendation lifecycle.
- Tenant/content relationship validation that prevents a recommendation from referencing another tenant's content.
- Administrator insights calculated from recorded member, learning, event, email-delivery, and community data without invented projections.
- Qualified summaries that state metric limitations, supporting metrics, suggested review actions, and explicit severity.
- A dedicated `tenant.insights.manage` permission with reviewed, dismissed, and reopened states. Insight output is advisory and requires human review.

These services use transparent rules rather than a provider-generated behavioral score. More advanced semantic similarity can be added later only after authorized embeddings, evaluation, and production safeguards are complete.

## Required migration

Run `supabase/migrations/0031_recommendations_insights.sql` after `0030` and before the eventual combined production application deployment. Then run `supabase/verify_upnexx_schema.sql` and confirm the `0031` checks report `PASS`.
