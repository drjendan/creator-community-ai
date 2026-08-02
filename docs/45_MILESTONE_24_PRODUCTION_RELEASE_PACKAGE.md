# Milestone 24 — Production Release Audit and Package

Milestone 24 completes the implementation sequence with a fail-closed package for the single combined production release. It does not deploy the application and does not create or use staging.

## Delivered

- `npm run release:preflight`, which verifies migration continuity through 0040, required environment-variable declarations, Git identity, worktree cleanliness, and a deterministic SHA-256 over packaged source files.
- An immutable release candidate containing the exact release reference, application version, 40-character commit SHA, artifact SHA-256, migration range, readiness snapshot, passed RLS run, and passed quality run.
- Candidate creation blocked while any readiness check is pending or failed. Explicit waivers remain visible in the frozen snapshot and require their existing evidence and notes.
- Matching production RLS and quality runs required for the candidate’s release reference and application version.
- Platform Owner-only release approval and deployment recording.
- Stale-candidate rejection when readiness evidence changes after packaging or linked verification regresses.
- Append-only candidate events for creation, approval, deployment recording, and cancellation.
- Platform Admin → Production Releases for gate visibility, candidate creation, approval, cancellation, and post-deployment evidence.
- Migration 0040 and schema-verifier coverage.

## Required migration

Run `supabase/migrations/0040_production_release_package.sql` after `0039`, then run `supabase/verify_upnexx_schema.sql`. Installing the migration does not approve or deploy a release.

## Direct-to-production release sequence

1. Finish and commit the combined milestone changes. Confirm the worktree is clean.
2. Run lint, typecheck, unit/integration tests, production build, credential-backed browser tests, and `npm run release:preflight`.
3. Configure the production environment and apply migrations through 0040. Run the schema verifier.
4. Use the same release reference and application version for the production RLS and quality verification runs. Complete every case with real evidence.
5. Complete or explicitly waive every Operational Readiness gate with authorized evidence. A waiver is a visible risk decision, not a pass.
6. Enter the clean preflight commit and artifact hashes in Platform Admin → Production Releases to freeze the candidate.
7. A Platform Owner reviews and approves the frozen package.
8. Push the approved commit to the production branch and monitor the production deployment.
9. Run production health, authentication, authorization, tenant/member, billing, email, media, domain, accessibility, and rollback smoke checks.
10. Only after deployment and smoke evidence exists, record the production deployment in the release console.

If any gate or verification changes after packaging, cancel the stale candidate and create a new one. Never reuse a digest from `--allow-dirty`, store secrets in release evidence, or record deployment before production actually succeeds.
