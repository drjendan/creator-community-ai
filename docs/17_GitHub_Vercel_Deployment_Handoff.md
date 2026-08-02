# UpNexx Production Deployment Handoff

**Last updated:** August 1, 2026

**Production source:** `main`

**Application root:** repository root

**Release model:** one combined direct-to-production release; no staging promotion

## Current status

Implementation is complete through Milestone 24 locally. Migrations 0018–0039 were reported successfully applied by the operator; migration 0040 remains required. No deployment is recorded as complete.

Pushing the approved `main` commit may trigger the connected production deployment. Do not push until the immutable release candidate contains the clean commit/artifact hashes, all production evidence gates are clear, and a Platform Owner has approved it.

## Production package

From the clean committed release source, run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run release:preflight
```

Use the preflight’s commit SHA and artifact SHA-256 in Platform Admin → Production Releases. A digest produced with `--allow-dirty` is local diagnostic output only.

## Environment and external systems

Configure production values outside source control for Supabase, encryption, Stripe, Resend, cron authorization, the application/root domains, and `CUSTOM_DOMAIN_CNAME_TARGET`. Configure exact production authentication redirects, signed webhook endpoints, DNS, certificate issuance, monitoring, alert delivery, backups, and recovery ownership.

Never place secret values in Git, documentation, chat, screenshots, readiness notes, or release evidence.

## Deployment sequence

1. Apply migration 0040 and run the schema verifier.
2. Complete the production isolation and quality runs using the final release reference/version.
3. Resolve or explicitly waive every production-readiness gate with evidence.
4. Run the clean source preflight and freeze the release candidate.
5. Obtain Platform Owner approval.
6. Push the exact approved commit to `main` and observe the production deployment.
7. Run health and critical-path smoke tests in production.
8. If a critical check fails, use the retained application/domain rollback procedure and keep the failed evidence.
9. Record deployment evidence only after production succeeds.

Repository configuration does not prove GitHub access, Vercel linkage, external provider readiness, DNS propagation, certificate validity, or production success. Operators must verify those systems directly during the approved release window.
