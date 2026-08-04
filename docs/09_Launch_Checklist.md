# 09 — Launch Checklist

**Purpose:** Provide evidence-based gates from internal alpha through public launch  
**Status:** Draft  
**Last Updated:** 2026-07-28  
**Intended Audience:** Product, engineering, security, operations, legal, marketing, sales, and support

## Contents

1. [Product, security, and billing](#brand-and-product)
2. [Tenant and quality readiness](#tenant-membership-and-content-setup)
3. [Legal, support, marketing, and operations](#legal-support-and-documentation)
4. [Launch gates](#launch-gates)
5. [Post-launch review](#post-launch-review)

Priority labels: **[Must]**, **[Should]**, **[Later]**. A checked box requires linked evidence, not verbal confirmation.

## Brand and product

- [ ] **[Must]** Approved UpNexx name, descriptor, logo, colors, and Nexx Jenn attribution used on all critical surfaces
- [ ] **[Must]** No user-facing PodcastOS or obsolete brand palette
- [ ] **[Must]** Tenant creation, branding, invitation, sign-in/out, password reset, and permission-denied flows verified
- [ ] **[Must]** Podcast/video, course, resource, event, community, and membership critical paths work
- [ ] **[Should]** Empty/loading/error states provide recovery
- [ ] **[Later]** Advanced enterprise and marketplace scope

## Security, privacy, and AI

- [ ] **[Must]** Live tenant-isolation/RLS matrix passes
- [ ] **[Must]** Service-role, encryption, Stripe, and provider keys confirmed server only
- [ ] **[Must]** Storage access for paid/member content reviewed
- [ ] **[Must]** Rate limits and abuse controls cover auth, forms, uploads, invites, and AI
- [ ] **[Must]** Privacy notice, terms, AI disclosure, retention, deletion, and incident owner approved
- [ ] **[Must]** Creator AI output stays draft and usage is metered
- [ ] **[Must]** Member AI cannot launch until authorized retrieval and citations pass
- [ ] **[Should]** AI evaluation, prompt-injection, refusal, and provider-failure suite

## Billing and memberships

- [ ] **[Must]** Platform subscriptions and audience memberships use separate tables/copy/reporting
- [ ] **[Must]** Billing operating model and owner approved
- [ ] **[Must]** Confirm `STRIPE_BILLING_ENABLED=false` for this release, or test the signed, idempotent Stripe webhook flow before enabling automated billing
- [ ] **[Must]** Trial, complimentary, cancellation, grace period, and access behavior documented
- [ ] **[Should]** Portal, invoices, failed-payment communications, and reconciliation
- [ ] **[Later]** Credit packages, Connect, and complex revenue sharing

## Tenant, membership, and content setup

- [ ] **[Must]** First tenant created with correct type, plan, features, branding, and administrator
- [ ] **[Must]** Membership templates and access rules reviewed
- [ ] **[Must]** Representative content imported and played/opened in member view
- [ ] **[Must]** Event URLs, time zones, and member visibility verified
- [ ] **[Must]** AI provider ownership, key storage, allowance, and support responsibility agreed
- [ ] **[Should]** Custom-domain workflow rehearsed

## Quality and accessibility

- [ ] **[Must]** Lint, TypeScript, unit/integration, Playwright, and production build pass
- [ ] **[Must]** Authenticated desktop/mobile critical-path tests pass
- [ ] **[Must]** Keyboard, focus, labels, contrast, zoom, reduced-motion, and screen-reader review
- [ ] **[Must]** No critical/high defects; medium defects have owner and workaround
- [ ] **[Should]** Visual regression baseline and performance budget
- [ ] **[Should]** Supported-browser matrix verified

## Legal, support, and documentation

- [ ] **[Must]** Terms, privacy, cookie/analytics, acceptable use, AI terms, and refund/cancellation language approved
- [ ] **[Must]** Support channel, hours, severity model, escalation, and incident communications assigned
- [ ] **[Must]** Documentation index reviewed and owners assigned
- [ ] **[Must]** Customer onboarding/runbook completed
- [ ] **[Should]** Help center, admin quick start, member guide, and status-page process

## Marketing and sales

- [ ] **[Must]** Claims match implemented capability
- [ ] **[Must]** Pricing/trial language marked proposed until approved
- [ ] **[Must]** Demo environment contains no customer secrets/data
- [ ] **[Must]** Pilot scope, success metrics, contract, and handoff owner defined
- [ ] **[Should]** Proof assets, launch content, lead routing, qualification, and follow-up sequence

## Deployment, domains, analytics, monitoring, and backup

- [ ] **[Must]** Correct repository/root directory selected in Vercel
- [ ] **[Must]** Production environment variables configured outside source control
- [ ] **[Must]** Production Supabase migrations through 0044, schema verifier, and redirect URLs verified
- [ ] **[Must]** Clean `npm run release:preflight` commit/artifact hashes frozen in an immutable release candidate
- [ ] **[Must]** Matching production isolation and quality runs complete; all readiness gates passed or explicitly waived
- [ ] **[Must]** Platform Owner approves the frozen candidate before the production push
- [ ] **[Must]** `upnexx.net`, `www.upnexx.net`, and `app.upnexx.net` ownership/routing decision approved
- [ ] **[Must]** SSL, canonical redirects, email DNS records, and rollback tested
- [ ] **[Must]** Error monitoring, uptime alerts, structured logs, and on-call owner active
- [ ] **[Must]** Database/storage backups configured and restore proof recorded
- [ ] **[Must]** Deployment and smoke-test evidence recorded only after production succeeds
- [ ] **[Should]** Consent-aware product analytics and funnel events
- [ ] **[Should]** Post-launch dashboard and review cadence

## Launch gates

### Internal alpha

- [ ] Core local production-mode workflows pass; no staging promotion is used
- [ ] No known tenant-isolation failure
- [ ] Seed/demo data only
- [ ] Defects and owners documented

### Private beta

- [ ] Security, privacy, support, onboarding, backups, and monitoring approved
- [ ] Design partners have scoped agreements and feedback cadence
- [ ] Manual workarounds are explicit
- [ ] Critical accessibility flows pass

### First paying customer

- [ ] Contracted requirements and billing method pass
- [ ] Tenant/domain/admin/content/member setup rehearsed
- [ ] Production incident and rollback owners available
- [ ] Success baseline and review dates documented

### Public launch

- [ ] Repeatable onboarding and support demonstrated
- [ ] Customer proof approved
- [ ] Automated billing/reconciliation and legal copy production ready
- [ ] Capacity, observability, recovery, analytics, and public communications pass

## Post-launch review

- [ ] Review incidents, activation, engagement, churn signals, AI cost, support load, and customer feedback
- [ ] Update roadmap and decision log
- [ ] Close or re-prioritize known risks
- [ ] Confirm claims remain accurate

## Open questions

- Which gate is the current target?
- Who has final go/no-go authority?
- Which manual processes are acceptable for the first customer?

## Related documents

[Roadmap](07_Product_Roadmap.md) · [Customer Onboarding](10_Customer_Onboarding.md) · [Security](12_Security_and_Privacy.md) · [Deployment](13_Deployment_and_Environment_Setup.md) · [Testing and QA](14_Testing_and_Quality_Assurance.md)
