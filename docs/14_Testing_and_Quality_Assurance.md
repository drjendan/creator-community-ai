# 14 — Testing and Quality Assurance

**Purpose:** Define current coverage and the quality gates required for release  
**Status:** In Review  
**Last Updated:** 2026-07-28  
**Intended Audience:** Engineering, QA, product, security, and release owners

## Contents

1. [Current stack and pyramid](#current-test-stack)
2. [Required domain suites](#required-domain-suites)
3. [Accessibility and visual coverage](#accessibility)
4. [Release acceptance](#release-acceptance)
5. [Defects, regression, and reporting](#defect-severity)

## Current test stack

- Vitest + jsdom
- Testing Library and user-event
- Playwright desktop Chrome and iPhone 13 profiles
- Next.js lint, TypeScript no-emit check, and production build
- V8 coverage configuration with 80% thresholds for selected utility files

Current repository tests cover business/access logic, form validation, reusable components, landing/demo/dashboard integration, brand contrast/logo variants, content loading success/failure, tenant resolution, subscription/AI configuration, and migration security contracts. Playwright covers public pages, auth protection, tenant examples, mobile navigation, invalid tenants, and conditional authenticated workflows.

## Test pyramid

| Layer | Current | Required growth |
| --- | --- | --- |
| Unit | Business logic, access helpers, validation, formatting | Billing math, AI metering/idempotency, domain rules |
| Component | Navigation, cards, forms, branding, content manager | All CRUD/error/permission states, dialogs, AI settings |
| Integration | Key application surfaces | Route handlers with realistic repositories and auth roles |
| E2E | Public/member routes; auth workflows conditional on credentials | Stable authenticated tenant/admin/member fixtures |
| Database/RLS | Static migration assertions | Live multi-role staging matrix |

## Required domain suites

### Tenant isolation and RLS

- same-tenant manager CRUD;
- member reads authorized published content;
- guest/public boundaries;
- cross-tenant read/write denial;
- platform-admin authority;
- suspended/deleted membership;
- user-owned conversation/recommendation data;
- storage path read/write/delete rules.

### Membership entitlements

Free/member/paid content, private/invite plans, multiple memberships, plan expiry, downgrade, cancellation, grace period, manual grant, tenant suspension, and server/RLS agreement.

### AI credits and quality

- allowance boundary, concurrent requests, failed provider call, duplicate retry, transaction reconciliation;
- provider/model/prompt structured-output tests;
- groundedness, citation correctness, refusal, prompt injection, cross-tenant exfiltration;
- latency, token/cost estimate, feedback and human acceptance.

### Billing and security

When implemented: Stripe signature, duplicate/out-of-order events, checkout return, portal, failed payment, refund/chargeback, access reconciliation. Also dependency/secret scans, authorization fuzzing, rate limits, uploads, session handling, and security headers.

## Accessibility

- Automated contrast and semantic checks where practical
- Keyboard-only critical workflows
- Focus visibility/order and modal behavior
- Names/labels/errors/live regions
- Screen-reader smoke tests
- 200% zoom/reflow and reduced motion
- Tenant-brand contrast validation

Automated tools do not replace manual assistive-technology review.

## Visual, performance, browser, and mobile

- Add screenshot baselines for landing, login, tenant shell, dashboard, content tiles/lists, dialogs, and error states.
- Measure Core Web Vitals, bundle growth, server latency, media/player behavior, and large-list/query performance.
- Launch matrix recommendation: current Chrome, Edge, Firefox, Safari; iOS Safari and Android Chrome.
- Validate approximately 390px mobile, tablet, laptop, and 1440–1536px desktop.

## Release acceptance

1. Lint, typecheck, unit/integration, and production build pass.
2. Critical Playwright flows pass without credential-based skips in release CI.
3. Live RLS/tenant isolation passes.
4. No open critical/high defects.
5. Critical workflows pass accessibility review.
6. Security, billing, AI, backup, and monitoring gates pass where enabled.
7. Known limitations and rollback plan are approved.

## Defect severity

| Severity | Definition | Release treatment |
| --- | --- | --- |
| Critical | Data exposure/loss, auth bypass, financial corruption, complete outage | Stop release; immediate response |
| High | Critical workflow unavailable or material incorrect access | Stop release unless formally contained |
| Medium | Significant degradation with workaround | Owner and target required |
| Low | Cosmetic/minor usability issue | Prioritize normally |

## Regression checklist

- [ ] Landing, navigation, login/reset/logout
- [ ] Platform and tenant authorization
- [ ] Tenant switch/provision/branding
- [ ] Podcast/video, courses, resources, events, community CRUD
- [ ] Member visibility and entitlement
- [ ] Membership-plan management
- [ ] AI provider configuration, generation, credits, failure
- [ ] Upload/storage and content deletion
- [ ] Mobile/keyboard/accessibility
- [ ] Error/loading/empty states
- [ ] Production build and smoke tests

## Test reporting

Record commit, environment, migration version, commands, totals, skips, failures, coverage, browser/device, known defects, screenshots/traces, and approver. Never include credentials or customer content in reports.

## Known gaps

- Authenticated E2E tests skip when environment credentials are absent.
- No live database RLS harness, Stripe tests, member AI quality suite, automated accessibility scanner, stable visual snapshots, load tests, or CI evidence.
- Coverage thresholds apply only to selected utility files.

## Open questions

- Which CI platform and release branches are authoritative?
- Which seeded roles/tenants can safely support automated E2E?
- What performance and availability budgets are launch requirements?

## Related documents

[Launch Checklist](09_Launch_Checklist.md) · [Security](12_Security_and_Privacy.md) · [Deployment](13_Deployment_and_Environment_Setup.md)
