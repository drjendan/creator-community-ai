# Production deployment readiness

The application implementation is complete through Milestone 24 and migration 0040. No production deployment is recorded by the repository, and this release does not use staging.

## Implemented release controls

- Production health and configuration diagnostics
- Evidence-backed operational, recovery, isolation, accessibility, critical-path, DNS, SSL, and rollback gates
- Durable notification delivery and protected member media
- Production billing and signed webhook boundaries
- Custom-domain ownership, activation, canonical routing, and rollback
- Deterministic source artifact digest and migration continuity preflight
- Immutable release candidate, Platform Owner approval, and post-deployment evidence history

## Required before the production push

1. Apply migrations through 0040 and run `supabase/verify_upnexx_schema.sql`.
2. Configure production-only environment values, provider webhooks, DNS, monitoring, backups, incident ownership, and authentication redirects.
3. Run production RLS and quality verification with real credentials and evidence.
4. Resolve or explicitly waive every Operational Readiness gate.
5. Commit the combined release, obtain a clean `npm run release:preflight` result, and freeze its exact commit and artifact digest.
6. Obtain Platform Owner approval for that immutable candidate.

## Required after deployment

- Verify `/api/health`, authentication redirects, role boundaries, tenant isolation, critical tenant/member/platform workflows, billing and email delivery, protected media, and custom-domain behavior.
- Exercise or confirm the approved application and domain rollback paths.
- Record the actual deployment identifier and smoke-test evidence only after production succeeds.

Configuration, a successful build, or migration installation alone is not production evidence. Never use the dirty-worktree preflight override for approval.
