# Milestone 7 — Creator AI Studio Workflow

**Status:** Completed locally; pending migration and combined production release

**Migration:** `0023_creator_ai_studio_workflow.sql` — required after `0022`
**Deployment:** None performed; no staging promotion

## Outcome

Creator AI Studio now uses readable, tenant-scoped content selection instead of raw database IDs. Selected source content is reloaded by trusted server code and constrained to the active tenant. Generated drafts are editable, versioned, auditable, and available in Content Library.

## Delivered

- Readable source selection for podcast episodes, courses, lessons, documents/resources, events, community discussions, and start-from-scratch text.
- Tenant-scoped server resolution for source titles and content; client-supplied text is ignored for selected records.
- Prompt-injection boundary that treats source material as untrusted reference data rather than model instructions.
- Output controls for audience, tone, channel, length, call to action, instructions, and variations.
- Permission enforcement through `tenant.ai.use` on the page and every AI route.
- Atomic AI credit reservation before provider execution, with unused reservations released afterward.
- Durable provider, model, prompt configuration, source title, charged credit, channel, and current-version metadata.
- Editable AI drafts with append-only version snapshots and audited saves.
- AI drafts in Content Library with search, filtering, status, and category support.

## Security and integrity invariants

- No raw source ID field is exposed to users.
- Every selected record is queried with both its ID and the active server-derived tenant ID.
- Provider keys remain server-only.
- Source material cannot override system generation instructions.
- A provider call cannot begin unless the tenant has enough reservable AI allowance.
- Credit reservation and release functions are executable only by the service role.
- Draft history and mutations are tenant-scoped and permission-gated.
- Generated content remains a draft until reviewed; AI output is never autonomously published or sent.

## Required production migration

Apply `supabase/migrations/0023_creator_ai_studio_workflow.sql` once after `0022`, then run `supabase/verify_upnexx_schema.sql`. All `0023` checks must report `PASS` before the application release.

The migration is additive except for expanding existing Content Library type constraints. Application rollback should retain the new schema and restore the prior Vercel deployment. Use a forward corrective migration if database behavior needs adjustment.

## Production-only verification

1. Confirm migration `0023` and the schema verifier pass.
2. Verify a user with `tenant.ai.use` can load only sources from the active tenant.
3. Verify a user without `tenant.ai.use` cannot load sources, generate, or edit drafts.
4. Generate from each supported source type with a configured production provider.
5. Include instruction-like text inside a source and confirm it is treated only as reference content.
6. Edit and save a draft twice, then confirm versions 1–3 and the audit records exist.
7. Confirm the AI draft appears in Content Library and can receive an applicable category.
8. Exhaust a controlled allowance and confirm the provider is not called after reservation fails.
9. Confirm no generated draft is published, scheduled, or sent without a separate human action.

## Validation

- `npm.cmd test`: 125 passed across 27 files.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with no warnings or errors.
- `npm.cmd run build`: passed; 81 pages generated and all AI Studio routes compiled.
- Playwright: all 26 executable browser scenarios passed and 6 credential-dependent scenarios skipped. The Windows process then hit the 120-second wrapper timeout during the known web-server teardown hang; there were no assertion failures.
- Provider-backed generation remains an operator-controlled production verification because no live provider key is used during local tests.

## Rollback

- Restore the retained prior production deployment.
- Disable `creator_ai_studio` entitlement if AI generation must stop immediately.
- Do not delete AI generation, usage, credit, version, or audit history during rollback.
