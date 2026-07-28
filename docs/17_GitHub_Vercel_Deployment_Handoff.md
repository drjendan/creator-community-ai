# UpNexx GitHub and Vercel Deployment Handoff

**Last updated:** July 28, 2026

**Local repository:** `C:\Users\danie\creator-community-ai`

**GitHub repository:** `https://github.com/drjendan/creator-community-ai`

**Branch:** `main`

## Current status

The local UpNexx application has been audited and successfully built. Pushing `main` to the connected GitHub repository triggers the production deployment in Vercel.

## Application structure

- The Next.js application root is the repository root:
  `C:\Users\danie\creator-community-ai`
- The project uses the App Router in the root-level `app` folder.
- Main page entry point: `app/page.tsx`
- Root layout: `app/layout.tsx`
- The project does not use `src/app`, `src/pages`, or `pages`.
- Vercel's Root Directory should remain the repository root.
- An additional `upnexx` wrapper folder is not required.

## Source included locally

The completed local commits contain the application source and supporting files, including:

- `app`
- `components`
- `lib`
- `public`
- `supabase`
- `docs`
- `e2e`
- `tests`
- `scripts`
- `middleware.ts`
- Playwright and Vitest configuration
- Next.js, TypeScript, Tailwind, PostCSS, and package configuration

## Files intentionally excluded

The following generated, local, or sensitive content is excluded:

- `.next`
- `node_modules`
- `.env`
- `.env.local`
- Other local environment files
- Supabase local state
- `coverage`
- `playwright-report`
- `test-results`
- `tmp`
- `tsconfig.tsbuildinfo`
- `next-env.d.ts`
- Secrets and local cache files

The repository `.gitignore` was reviewed and updated to exclude `tmp`. It does not exclude application source folders.

## Local verification

The following commands completed successfully:

```text
npm install
npm run build
```

The production build passed using Next.js 15.5.21. The build generated the landing page, authentication, dashboard, platform administration, APIs, and member-facing routes.

`npm install` reported 12 high-severity dependency advisories. An automatic forced audit fix was not run because it could introduce breaking dependency upgrades. These advisories should be reviewed separately.

## Local Git commits

The requested source commit exists locally:

```text
57aa1e8 Add UpNexx application source files for Vercel deployment
```

The remote repository had an unrelated history, so it was merged locally without rewriting the remote branch:

```text
bcad8ac Merge existing GitHub main before UpNexx source push
```

The last known GitHub `origin/main` commit was:

```text
d705f6991a496709e3a7c14e73d97451ee525c44
```

## Current blocker

The attempted push returned:

```text
Permission to drjendan/creator-community-ai.git denied to focusquestsrm.
HTTP 403
```

The GitHub CLI is not installed, so no alternate GitHub CLI login was available.

## How to resume

Complete either of these GitHub access steps:

1. Grant the GitHub user `focusquestsrm` write access to `drjendan/creator-community-ai`; or
2. Reauthenticate Git on this computer with a GitHub account that already has write access to the repository.

Do not place a GitHub password, personal access token, Supabase key, or other secret in this document or in chat.

After access is corrected, run from the application root:

```text
git status
git push origin main
```

Then verify that GitHub contains at least:

```text
app/page.tsx
app/layout.tsx
components/
lib/
public/
supabase/
middleware.ts
```

After the push succeeds, trigger or retry the Vercel deployment. Leave the Vercel Root Directory at the repository root.

## Vercel environment variables

Configure values in Vercel Project Settings. Do not commit their values.

Core application variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_ENCRYPTION_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_ROOT_DOMAIN
```

For production, `NEXT_PUBLIC_APP_URL` must be the production Vercel or custom-domain URL, not `http://localhost:3000`.

Integration variables required when those features are enabled:

```text
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
EMAIL_FROM
```

## Next-session checklist

- Confirm which GitHub account now has repository write access.
- Check `git status` before making any additional changes.
- Push local `main` to `origin`.
- Confirm `app/page.tsx` and `app/layout.tsx` appear on GitHub.
- Retry the Vercel deployment.
- Add the required production environment variables in Vercel.
- Test the deployed landing page, login, tenant administration, podcast, courses, resources, and events.
- Review the outstanding NPM security advisories separately.
