# 12 — Security and Privacy

**Purpose:** Define current controls, production requirements, and known security/privacy gaps  
**Status:** In Review  
**Last Updated:** 2026-07-28  
**Intended Audience:** Engineering, security, operations, product, legal, and customer stakeholders

## Contents

1. [Principles and isolation](#principles)
2. [Authentication and credentials](#authentication-and-authorization)
3. [Data, storage, and AI privacy](#data-and-storage)
4. [Logging, abuse, and vendors](#logging-and-audit)
5. [Incident response and recovery](#incident-response)
6. [Compliance, testing, and gaps](#compliance-roadmap)

## Principles

1. Deny by default and grant the minimum authority.
2. Treat `tenant_id` as a security boundary.
3. Enforce authorization server-side and through RLS.
4. Keep secrets and privileged operations out of browsers.
5. Collect, retain, and expose only necessary data.
6. Make high-risk actions attributable and recoverable.
7. Do not claim certification or compliance without scoped evidence.

## Tenant isolation and RLS

Repository migrations enable RLS and define platform-admin, tenant-member, tenant-manager, user-owner, publication, and entitlement policies. Application queries also filter by tenant.

**Needs Validation:** run the approved live production verification matrix during the combined release window for platform owner/admin, tenant owner/admin, content manager, moderator, member, guest, cross-tenant user, suspended membership, and paid/free access. Static SQL tests are not sufficient; this release does not use staging.

## Authentication and authorization

- **Implemented:** Supabase email/password auth, server cookies, middleware protection, sign-out, password-reset UI/direction.
- **Partial:** invitation delivery/acceptance and comprehensive profile/account lifecycle.
- Platform roles come from trusted app metadata/server checks; ordinary users must not self-assign them.
- Tenant administration requires tenant membership/role checks.
- Member content and AI require tenant membership plus content/plan entitlement.
- Middleware improves routing but every server mutation must authorize independently.

## Privileged credentials

- `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY`, Stripe secrets, email keys, and AI keys are server only.
- Service-role access bypasses RLS; restrict it to narrow server workflows and never log it.
- `.env.local` is gitignored; `.env.example` contains blank placeholders.
- Rotate leaked credentials immediately and document affected encrypted data.
- Do not place secret values in documentation, screenshots, client bundles, analytics, errors, or support tickets.

## Tenant AI key encryption

Tenant provider keys are encrypted with AES-256-GCM using the server-side application encryption key; the browser receives only provider/model and masked last-four information. Changing the encryption key without a rotation plan makes stored keys unreadable.

Before production:

- define key rotation/versioning;
- restrict decrypt permission to provider-call code;
- audit create/update/delete/use events without recording the key;
- consider a managed secret vault/HSM as scale and risk grow.

## Data and storage

- TLS protects data in transit; Supabase provides platform encryption at rest.
- The `tenant-assets` bucket is currently public with tenant-path policies. Paid/restricted content may require private buckets and signed URLs.
- Validate MIME, size, quotas, malware scanning, filename safety, and orphan deletion.
- Define export, deletion, retention, legal hold, and backup handling by data category.

## AI privacy and safety

- Retrieve only authorized tenant sources.
- Do not send unnecessary member data to providers.
- Document provider retention/training settings and DPAs.
- Treat prompts, source excerpts, outputs, feedback, and usage metadata as potentially sensitive.
- Member answers require citations and low-confidence refusal.
- Creator output requires human review before publishing.
- Prompt injection and data-exfiltration tests are launch requirements for member RAG.

## Logging and audit

Audit tenant creation, role/entitlement changes, invitations, AI key changes/use, billing changes, administrative access, content deletion, exports, and security events. Operational logs should use request/trace IDs and minimal user/tenant identifiers.

Never log passwords, sessions, authorization headers, service keys, full AI keys, payment data, or unrestricted prompts/content.

## Rate limiting and abuse prevention

**Recommended before production:** per-IP/user/tenant limits for login/reset, public forms, invitations, uploads, content mutation, AI, search, comments, and webhooks; bot controls where proportionate; upload quotas; account lock/alert strategy; moderation/reporting for community content.

## Vendor risk

Target vendors include Supabase, Vercel, Cloudflare, Stripe, Resend, AI providers, Sentry, and PostHog. Only Supabase and direct AI provider calls are evidenced in current application dependencies/workflows. Review security, privacy, subprocessors, regions, breach terms, deletion, availability, and contract responsibilities before production activation.

## Incident response

1. Detect and preserve evidence.
2. Assign incident commander and severity.
3. Contain compromised accounts, keys, tenant paths, or integrations.
4. Assess affected tenants/users/data and legal obligations.
5. Eradicate, restore, validate, and monitor.
6. Communicate through approved channels.
7. Complete post-incident actions and decision-log updates.

Contacts, severity response times, notification obligations, and status-page process remain `[To be assigned]`.

## Backup and recovery

- Configure database and storage backups appropriate to the environment.
- Prove restoration on a schedule; backup existence alone is insufficient.
- Define RPO, RTO, retention, encryption, access, and regional strategy.
- Keep application migration versions and rollback/forward-fix runbooks.

## Data rights

**Implemented baseline:** authenticated tenant-aware personal export plus correction and member-account closure requests with governed resolution and audit evidence. The workflow intentionally does not perform automatic deletion. Approved retention periods, identity-provider deletion, paid-service cancellation, content deletion, and full tenant offboarding still require policy and operational decisions.

## Compliance roadmap

No formal certification is evidenced. Recommended sequence:

1. data inventory, processing purposes, retention, and vendor register;
2. privacy/terms/acceptable-use/AI disclosures;
3. security policies, access reviews, incident/recovery exercises;
4. customer contractual controls and evidence collection;
5. assess SOC 2, GDPR, CCPA/CPRA, accessibility, PCI scope, and sector-specific obligations based on actual customers.

Church, education, nonprofit, health-adjacent, or children-related use does not automatically make UpNexx compliant with specialized law.

## Security testing

- Dependency and secret scanning
- Static analysis and configuration review
- Live RLS/tenant isolation matrix
- Authentication/session/role tests
- Upload/storage policy tests
- API authorization, validation, rate, and idempotency tests
- AI prompt-injection, citation, exfiltration, and cross-tenant tests
- Billing webhook and replay tests
- Penetration testing before public/high-risk launch

## Known gaps

Durable application rate limits, a reviewable security-event pipeline, reauthorized delivery from the private tenant-media bucket, and an operational evidence workflow are implemented. External alert routing, infrastructure/WAF controls, completed restore exercises, a live production RLS matrix, and formal compliance evidence remain outstanding until operators perform and record them. Data-rights workflow controls are implemented, but approved retention/deletion operations and legal ownership remain outstanding.

## Open questions

- What data classes and retention periods are approved?
- Are any first customers subject to specialized regulation?
- What RPO/RTO and incident response commitments will contracts contain?
- Is tenant BYO AI mandatory, optional, or transitional?

## Related documents

[System Architecture](03_System_Architecture.md) · [Database Design](04_Database_Design.md) · [AI Architecture](05_AI_Architecture.md) · [Launch Checklist](09_Launch_Checklist.md)
