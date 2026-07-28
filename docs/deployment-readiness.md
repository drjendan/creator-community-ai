# Deployment readiness

The application is Vercel-compatible but has not been deployed automatically.

## Ready

- One Next.js/TypeScript/Tailwind codebase
- Public, tenant, platform-admin, tenant-admin, and member routes
- Responsive navigation and professional brand system
- Supabase browser/server clients and auth middleware foundation
- Environment placeholders only
- Unit, integration, and browser regression suites

## Required before production

- Apply and test migrations in Supabase staging
- Generate exact database types
- Finish sign-up, invitation, logout, reset, and tenant-selection actions
- Integrate Stripe billing and verified webhooks
- Add email delivery and background processing
- Enforce paid entitlements in RLS
- Configure custom domains and certificate verification
- Add monitoring, backups, retention, privacy, and incident procedures
- Perform accessibility, security, load, and tenant-isolation testing
- Replace mock data with repository/service queries

Do not deploy with mock authorization assumed to be production access control.
