# 16 — Decision Log

**Purpose:** Record durable UpNexx product and architecture decisions with context  
**Status:** In Review  
**Last Updated:** 2026-07-28  
**Intended Audience:** Product, engineering, design, security, operations, and commercial owners

## Decision template

```markdown
## DEC-XXX — Short decision title

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded | Rejected
- **Decision:** What was decided
- **Context:** Why a decision was needed
- **Options considered:** Meaningful alternatives
- **Rationale:** Why this option was selected
- **Consequences:** Benefits, costs, risks, and follow-up
- **Owner:** [Name/role]
- **Related files:** Links or repository paths
```

## Established decisions

| ID | Date | Status | Decision | Context and rationale | Consequences | Owner | Related files |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | 2026-07-28 | Accepted | Product name is UpNexx | Broader platform identity beyond podcasts | User-facing legacy name must be removed | `[Owner]` | `app/layout.tsx`, brand docs |
| DEC-002 | 2026-07-28 | Accepted | Nexx Jenn Technologies is the parent company | Maintain product/company architecture | Attribution remains separate | `[Owner]` | [Brand](02_Brand_Guidelines.md) |
| DEC-003 | 2026-07-28 | Accepted | UpNexx has a distinct product identity | Product must scale beyond corporate gear identity | U-arrow logo; parent gear not product mark | `[Owner]` | `components/brand/UpNexxLogo.tsx` |
| DEC-004 | 2026-07-28 | Accepted | Brand uses navy, violet, purple, and cyan | Premium intelligent SaaS direction | Central tokens and contrast requirements | `[Owner]` | `tailwind.config.ts`, `app/globals.css` |
| DEC-005 | 2026-07-28 | Accepted | Platform subscriptions and audience memberships are separate | Different buyers, sellers, access, and revenue | Separate tables, UI language, billing, reporting | `[Owner]` | [Subscription Model](11_Subscription_and_Membership_Model.md) |
| DEC-006 | 2026-07-28 | Accepted | Multi-tenancy is required from the beginning | Customer data must remain isolated | Tenant IDs, roles, RLS, domain resolution | `[Owner]` | migrations 0001–0006 |
| DEC-007 | 2026-07-28 | Accepted | AI should use a provider abstraction layer | Avoid provider lock-in and inconsistent controls | Current direct route is partial; service refactor remains | `[Owner]` | [AI Architecture](05_AI_Architecture.md) |
| DEC-008 | 2026-07-28 | Accepted | AI usage is metered | Control provider cost and plan allowances | Usage/credit records and idempotency required | `[Owner]` | migration 0006 |
| DEC-009 | 2026-07-28 | Accepted | Member AI accesses only authorized tenant content | Tenant privacy and membership boundaries | Retrieval filters and citations are launch gates | `[Owner]` | [Security](12_Security_and_Privacy.md) |
| DEC-010 | 2026-07-28 | Accepted | UpNexx has a separate website from Nexx Jenn Technologies | Product marketing and conversion need distinct focus | Cross-brand attribution remains | `[Owner]` | [Brand](02_Brand_Guidelines.md) |
| DEC-011 | 2026-07-28 | Accepted | `upnexx.net` is the product domain | Establish canonical product namespace | Subdomain/DNS pattern still requires validation | `[Owner]` | [Deployment](13_Deployment_and_Environment_Setup.md) |
| DEC-012 | 2026-07-28 | Accepted | Vercel is the intended deployment platform | Align with Next.js hosting direction | Production configuration and approval remain | `[Owner]` | [Deployment](13_Deployment_and_Environment_Setup.md) |
| DEC-013 | 2026-07-28 | Accepted | Supabase is the backend | Integrated auth, PostgreSQL, RLS, and storage | Live migration/RLS evidence remains essential | `[Owner]` | `lib/supabase`, migrations |
| DEC-014 | 2026-07-28 | Accepted | Stripe is the intended billing provider | Platform/audience billing direction | SDK and flows remain planned | `[Owner]` | [Subscription Model](11_Subscription_and_Membership_Model.md) |
| DEC-015 | 2026-07-28 | Accepted | Version 1.0 prioritizes first-customer readiness | Limit scope and validate real outcomes | Enterprise/marketplace/mobile deferred | `[Owner]` | [Roadmap](07_Product_Roadmap.md) |

## Pending decisions

- Audience-payment merchant-of-record and Stripe Connect model
- First customer segment and Version 1.0 acceptance contract
- Production DNS/subdomain pattern and Cloudflare role
- AI default provider/model and platform-managed-key policy
- Retention periods, RPO/RTO, support commitments, and compliance scope
- Queue/background-job platform and observability vendors

## Open questions

Who owns decision numbering, approval, and supersession review?

## Related documents

[Documentation Index](README.md) · [Product Vision](01_Product_Vision.md) · [System Architecture](03_System_Architecture.md)

