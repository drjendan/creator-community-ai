# Subscription, membership, and AI architecture

## Decisions and assumptions

- `tenant_subscriptions` is the subscription a tenant pays UpNexx for.
- `tenant_membership_plans` is the existing tenant-scoped table for plans a tenant sells to its audience. It is intentionally not duplicated as `membership_plans`.
- `member_subscriptions` connects an audience member to one tenant membership plan.
- One authenticated user may belong to multiple tenants and may therefore manage or subscribe to multiple podcasts with one email address.
- `tenant_type` changes terminology, onboarding guidance, and recommended templates. It does not fork the product into separate applications.
- Platform plans are seeded database configuration. Tenant-specific values in `tenant_feature_entitlements` and `tenant_subscriptions.ai_credit_allowance` override plan defaults.
- Prices are stored as decimal amounts to extend the existing schema. Stripe identifiers are references only; Stripe Checkout and webhooks are not implemented in this phase.

## Data flow

Platform administrator â†’ seven-step tenant wizard â†’ tenant â†’ platform subscription â†’ feature overrides â†’ branding â†’ audience membership template â†’ administrator invitation â†’ audit log.

Tenant administrator â†’ Membership Plans â†’ `tenant_membership_plans` â†’ plan features/content rules â†’ `member_subscriptions` â†’ server-side `has_content_access`.

Creator â†’ Creator AI Studio â†’ authenticated tenant resolution â†’ feature/credit check â†’ encrypted provider key decrypted server-side â†’ provider request â†’ saved generation â†’ usage row â†’ credit transaction â†’ audit log.

## AI architecture

The existing knowledge-source, document, chunk, conversation, and message tables remain the RAG foundation. Migration `0006` adds phased feature entitlements, generation storage, recommendations, qualified administrator insights, feature-level credit configuration, aggregate tenant usage, and a credit ledger.

Creator AI Studio supports the required source and output enums and calls OpenAI, Anthropic, or Google from a Node server route. Provider keys are AES-256-GCM encrypted and are never returned to the browser.

Member AI Assistant is the next phase. It must retrieve only rows allowed by `has_content_access`, attach citations, preserve tenant-scoped conversation history, and decline when authorized evidence is insufficient.

Recommendations are designed as rules first: membership plan, interests, progress, listening, saves, attendance, tags, and recency produce a score and a fixed reason. AI may rewrite the explanation but must not choose inaccessible content.

Administrator insights must store qualified language plus `supporting_metrics`. The interface must present the metrics alongside every AI-generated interpretation.

## Credit model

- Platform plan allowance â†’ optional tenant override â†’ current usage.
- Membership plans optionally assign a member AI allowance.
- `ai_feature_credit_config` defines base and token-based charges per feature.
- `ai_usage` records provider, model, tokens, estimated cost, credits, status, tenant, user, and timestamp.
- `tenant_ai_credit_transactions` is the immutable credit ledger.
- Requests are rejected with a clear allowance message when insufficient credits remain.

## Security controls

- Every new tenant-aware table enables RLS.
- Platform authority comes only from server-controlled `app_metadata.platform_role`.
- Tenant managers are resolved from the authenticated session; browser-supplied tenant IDs are not trusted.
- Main content read policies call `has_content_access`.
- AI provider settings remain revoked from `anon` and `authenticated`; authenticated server routes authorize first and then use the service role.
- `APP_ENCRYPTION_KEY` and service-role credentials are imported only by server-only modules.
- Tenant creation, subscription changes, membership-plan changes, provider changes, and AI generations produce audit events.

## Known limitations and roadmap

1. Apply migration `0006` before using the new interfaces.
2. Stripe Checkout, Connect, customer portal, and signed webhooks remain unimplemented.
3. Member RAG retrieval, citations, feedback UI, and recommendation delivery are schema-ready but not implemented.
4. Administrator AI Insights UI and activity aggregation are schema-ready but not implemented.
5. AI credit reservation should be moved into one transactional database function before high-concurrency production use.
6. Exact generated Supabase database types should replace the permissive repository type shim.
7. A staging project with seeded multi-role, multi-tenant users is required for executable RLS policy tests.

