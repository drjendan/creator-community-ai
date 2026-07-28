# 15 — Product Glossary

**Purpose:** Provide canonical UpNexx business and technical terminology  
**Status:** Approved  
**Last Updated:** 2026-07-28  
**Intended Audience:** All product, technical, commercial, support, and customer stakeholders

| Term | Definition |
| --- | --- |
| Platform | The UpNexx SaaS application and services operated for multiple tenants. |
| Tenant | A customer organization/workspace isolated by a unique tenant ID. |
| Platform administrator | Trusted UpNexx operator who manages platform-level tenants and operations. |
| Tenant administrator | User authorized to configure and manage one tenant. |
| Tenant owner | Highest tenant-scoped business authority; not automatically a platform administrator. |
| Creator | Tenant user who produces or manages content and AI-generated drafts. |
| Member | Audience user belonging to a tenant and receiving tenant-defined access. |
| Guest | Unauthenticated or non-member visitor with only public access. |
| Platform subscription | The commercial plan a tenant purchases from UpNexx. |
| Audience membership | A free or paid plan a tenant offers to its own members. |
| Platform plan | Creator, Growth, Professional, Enterprise, Trial, Complimentary, or Custom commercial configuration. |
| Entitlement | Server-enforced permission or limit derived from a plan, override, role, or membership. |
| Feature flag | Controlled switch enabling a capability by environment, tenant, plan, or rollout. |
| Usage limit | Maximum allowed use of members, admins, content, storage, AI, or another measured resource. |
| AI credit | Product unit charged for an AI feature; not necessarily equal to a provider token. |
| AI generation | Creator-requested draft produced from source content and saved for review. |
| AI assistant | Member-facing question/answer experience grounded in authorized tenant content. |
| Recommendation | Ranked, authorized suggestion for content, learning, events, resources, or discussion. |
| Administrator insight | AI- or rule-generated finding intended for human administrative review. |
| Learning path | Ordered set of content/lessons intended to support a learning goal. |
| Content source | Tenant-approved item eligible for AI ingestion or generation. |
| Transcript | Text representation of episode/media speech. |
| Resource | Tenant file or link offered independently or alongside content. |
| Community | Tenant spaces, posts, comments, reactions, and moderation context. |
| RAG | Retrieval-augmented generation: retrieve authorized sources before generating an answer. |
| Embedding | Numeric representation used to compare semantic similarity. |
| Vector search | Similarity retrieval over embeddings, represented with pgvector in the schema. |
| Chunk | Searchable section of a source document with access and provenance metadata. |
| Citation | Member-visible reference to the authorized source supporting an AI answer. |
| White label | Tenant-controlled visual/member identity within platform rules. |
| Custom domain | Tenant-owned hostname mapped to a tenant experience. |
| Tenant isolation | Prevention of one tenant accessing another tenant’s data or secrets. |
| RLS | PostgreSQL Row Level Security policies enforcing row access. |
| Service-role key | Supabase server credential that bypasses RLS; never browser-exposed. |
| BYO API key | Tenant provides its own AI-provider credential, encrypted server-side. |
| Trial | Time-bound platform or audience access before conversion/expiry. |
| Complimentary account | Approved tenant platform subscription with no platform charge for a defined reason/period. |
| MRR | Monthly recurring revenue, reported separately for UpNexx platform and tenant audience revenue. |
| Churn | Lost customers/members or recurring revenue during a period. |
| Retention | Continued active or paid participation over time. |
| Conversion | Movement from prospect/trial/free access to a target active or paid state. |
| Activation | Completion of the first meaningful setup/member-value milestone. |
| RPO | Recovery Point Objective: acceptable data-loss window. |
| RTO | Recovery Time Objective: target time to restore service. |
| Stripe webhook | Signed provider event used to reconcile billing state; planned. |
| Tenant context | Resolved tenant ID, authenticated user, role, and access information used by server operations. |

## Usage rules

- Never use “subscription” alone where platform versus audience could be ambiguous.
- Use “tenant” internally/technically and the customer’s organization/workspace name in user-facing copy.
- Use “AI-generated draft,” not “published content,” until a person approves it.
- Use “implemented,” “partial,” “planned,” and “recommended” consistently with repository evidence.

## Open questions

Add approved terms for future integrations, commerce, marketplace, and enterprise identity as those decisions are made.

## Related documents

[Product Vision](01_Product_Vision.md) · [Subscription Model](11_Subscription_and_Membership_Model.md) · [Decision Log](16_Decision_Log.md)

