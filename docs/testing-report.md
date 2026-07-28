# Testing report

Date: July 27, 2026  
Environment: Windows, Node.js, Next.js 15.5.21

## Final required results

| Command | Result |
|---|---|
| `npm run lint` | Passed; no ESLint warnings or errors. Next.js emitted only its deprecation notice for `next lint`. |
| `npm run typecheck` | Passed; zero TypeScript errors. |
| `npm run test` | Passed; 4 files and 16 tests. |
| `npm run test:coverage` | Passed; 4 files and 16 tests. |
| `npm run test:e2e` | Passed after the Podcast View update; 11 tests passed and 1 test skipped in 7.2 seconds. |
| `npm run build` | Passed; production compilation, type validation, and 19-page static generation completed. |

## Coverage

Coverage scope is the requested business-logic layer: access control, auth route decisions, formatting, tenant resolution, and form validation.

| Measure | Coverage |
|---|---:|
| Statements | 94.87% (37/39) |
| Branches | 88.88% (40/45) |
| Functions | 100% (13/13) |
| Lines | 100% (29/29) |

This exceeds the 80% target without counting page markup solely to inflate coverage.

## Test coverage summary

Vitest/React Testing Library verifies pricing logic, tenant resolution, roles, access-control helpers, navigation, cards, validation, formatting, public sales rendering, pricing display, demo tenant branding, dashboard navigation, episode filtering logic, and membership rendering.

Subscription/AI tests also verify required tenant types and platform plans, membership templates, terminology mappings, credit exhaustion behavior, phased feature keys, and the migration's RLS/access-policy contract.

Latest subscription/AI upgrade verification:

- TypeScript: passed.
- ESLint: passed with no warnings.
- Vitest: 24 tests passed across 5 files.
- Playwright: 11 passed and 9 intentionally skipped. Eight authenticated tenant-creation, audience-membership, and Creator AI Studio cases require `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`; the member AI Assistant case is skipped until its authorized RAG/citation interface is implemented.

Playwright verifies the landing page, pricing visibility, AI at Work example, tenant branding, tenant and member dashboards, dashboard navigation, mobile navigation, invalid tenant handling, and playable Podcast View rendering in desktop Chromium and mobile WebKit.

## Skipped test

One Playwright case is skipped by design: `mobile navigation opens` in the desktop Chromium project. The same regression runs and passes in the mobile WebKit project. This is a project-condition skip, not an untested feature.

The requested unauthorized redirect is conditional on authentication being enabled. Live Supabase credentials were not available, so the real authentication redirect and live tenant-isolation policies were not exercised end-to-end. Unit tests cover route-decision helpers, and middleware implements the redirect foundation.

## Known limitations and defects

- The Supabase migration and RLS policies were not applied to a live project. They require staged policy and cross-tenant testing.
- Authentication actions, billing, email, AI providers, domains, and uploads are foundations or mock experiences, not live integrations.
- The legacy `podcast_episodes` table is preserved beside the new `episodes` table pending a safe data migration.
- `next lint` is deprecated in Next.js 15 and should be migrated to the ESLint CLI in the next tooling update.
- `npm audit --omit=dev --json` could not reach the registry from the restricted environment. The install command reported 12 high-severity advisories without actionable detail; dependency auditing remains required before deployment.

## Exact commands used

```powershell
npm.cmd install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test eslint-config-next@15.5.7
npm.cmd install --save-dev @vitejs/plugin-react
npx.cmd playwright install chromium webkit
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:coverage
npm.cmd run build
npm.cmd run start
npm.cmd run test:e2e
```

The final Playwright run reused the production server started by `npm run start` so the Windows process could shut down cleanly after testing. The server was stopped after verification.

## Local review

1. Open PowerShell in `C:\Users\danie\creator-community-ai`.
2. Run `npm.cmd install`.
3. Run `npm.cmd run dev`. Using `npm.cmd` avoids the common Windows PowerShell execution-policy error for `npm.ps1`.
4. Open `http://localhost:3000`.
5. Review `/demo/ai-at-work`, `/demo/ai-at-work/member`, `/dashboard`, and `/platform-admin`.
6. Leave Supabase variables blank to use the labeled mock experience. To test live auth, create `.env.local` from `.env.example` and add development project values.

## Recommended next phase

Apply the schema to a staging Supabase project, generate exact types, implement real auth/invitations, create seeded multi-role tenants, and run an automated tenant-isolation/RLS matrix. Then add Stripe billing and replace mock repositories with tenant-scoped server queries.
