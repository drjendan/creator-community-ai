# UpNexx Documentation

**Purpose:** Source of truth for the UpNexx product, architecture, operations, and launch  
**Status:** In Review  
**Last Updated:** 2026-07-28  
**Intended Audience:** Product leaders, developers, designers, operators, sales, support, and implementation partners

## Product summary

UpNexx is **The Intelligent Content, Learning & Community Platform** from Nexx Jenn Technologies. It helps knowledge-based organizations transform expertise into engagement, learning, retention, and revenue through content, courses, community, events, memberships, and responsible AI.

Repository evidence—not aspiration—determines whether this documentation labels a capability **Implemented**, **Partial**, **Planned**, or **Recommended**.

## Document status legend

| Label | Meaning |
| --- | --- |
| Draft | Initial content; material decisions may change |
| In Review | Substantive and ready for stakeholder review |
| Approved | Accepted as the current business or technical direction |
| Needs Validation | Depends on customer, legal, security, or operational confirmation |
| Implemented | Supported by current repository evidence |
| Planned | Intended but not yet delivered |

## Documentation index

| Document | Purpose | Status |
| --- | --- | --- |
| [01 Product Vision](01_Product_Vision.md) | Product direction, customers, boundaries, and success | In Review |
| [02 Brand Guidelines](02_Brand_Guidelines.md) | Product identity, messaging, visuals, and accessibility | Approved |
| [03 System Architecture](03_System_Architecture.md) | Current and target technical architecture | In Review |
| [04 Database Design](04_Database_Design.md) | Supabase schema, isolation, relationships, and gaps | In Review |
| [05 AI Architecture](05_AI_Architecture.md) | Creator AI, member AI, recommendations, metering, and safety | In Review |
| [06 Design System](06_Design_System.md) | UI tokens, components, states, and responsive guidance | Approved |
| [07 Product Roadmap](07_Product_Roadmap.md) | Sequenced delivery plan and release scope | Needs Validation |
| [08 Go-to-Market Strategy](08_Go_To_Market_Strategy.md) | Positioning, packaging, acquisition, and proof | Needs Validation |
| [09 Launch Checklist](09_Launch_Checklist.md) | Alpha, beta, customer, and public-launch gates | Draft |
| [10 Customer Onboarding](10_Customer_Onboarding.md) | Tenant and audience-member onboarding | In Review |
| [11 Subscription and Membership Model](11_Subscription_and_Membership_Model.md) | Platform billing versus audience memberships | In Review |
| [12 Security and Privacy](12_Security_and_Privacy.md) | Security controls, privacy, risks, and gaps | In Review |
| [13 Deployment and Environment Setup](13_Deployment_and_Environment_Setup.md) | Local, preview, production, domains, and troubleshooting | In Review |
| [14 Testing and QA](14_Testing_and_Quality_Assurance.md) | Current tests and release-quality strategy | In Review |
| [15 Product Glossary](15_Product_Glossary.md) | Canonical product and technical terminology | Approved |
| [16 Decision Log](16_Decision_Log.md) | Established decisions and a future decision template | In Review |

## Recommended reading order

1. Product vision and glossary
2. Brand and design system
3. System, database, AI, and security architecture
4. Subscription model and customer onboarding
5. Roadmap, launch checklist, deployment, and QA
6. Go-to-market strategy and decision log

## Ownership and update expectations

- **Product owner:** `[Owner to assign]`—vision, roadmap, packaging, and customer outcomes.
- **Technical owner:** `[Owner to assign]`—architecture, database, security, deployment, and QA.
- **Brand owner:** Nexx Jenn Technologies—brand guidelines and approved messaging.
- **Operations owner:** `[Owner to assign]`—launch, onboarding, support, and incident procedures.
- Update affected documents in the same change as a material product or architecture decision.
- Review **Needs Validation** items before customer or production commitments.
- Record durable decisions in the [Decision Log](16_Decision_Log.md).

## How developers and Codex should use these documents

1. Start with this index and the relevant domain document.
2. Verify implementation claims against code, migrations, tests, and configuration.
3. Do not treat **Planned** or **Recommended** content as authorization to build or deploy.
4. Keep platform subscriptions separate from audience memberships in code, copy, and data.
5. Never place credentials, tokens, customer data, or service-role values in documentation.
6. Update status labels and related links when implementation changes.

## Proposing changes

Create a focused repository change that:

- explains the business or technical reason;
- updates every affected document without duplicating content;
- adds a decision-log entry when the change is durable;
- identifies open questions and owners;
- validates internal links and terminology.

## Preserved reference material

Earlier files such as `PRODUCT-SPEC.md`, `BUILD-PLAN.md`, `architecture.md`, `database-schema.md`, `rls-security.md`, and `testing-report.md` remain historical or detailed implementation references. This numbered documentation set is the current navigational source of truth; conflicts should be resolved in favor of repository evidence and an explicit decision-log entry.

## Known documentation gaps

- Production hosting, DNS ownership, and deployment state need stakeholder confirmation.
- Pricing and plan limits require market validation.
- Legal policies, retention periods, incident contacts, and recovery objectives are not approved.
- Stripe, Resend, Sentry, PostHog, and production AI-provider accounts are not evidenced as integrated.
- Live RLS verification against a staging database is still required.
- Named document owners and review cadence remain unassigned.

## Open questions

- Who approves product, technical, security, and launch documents?
- Which first-customer segment and use case will anchor Version 1.0?
- Is Vercel the confirmed production host and Cloudflare the confirmed DNS provider?
- What retention, recovery, and support service levels are required?

