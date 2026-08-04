# Community Launch release record

## Delivered locally

- Community Settings with Identity, Branding, Public Page, Links & Social, Member Experience, Sharing, SEO, and Advanced areas.
- Community name remains visible beside every uploaded tenant logo.
- Published public community landing page with eligibility states, public content, plans, resources, events, testimonials, and legal/powered-by footer.
- Tenant-scoped, consent-backed lead capture with rate limiting, bot honeypot, audit history, and durable Resend resource delivery.
- Share Community page with canonical link, UTM parameters, social caption, accessible website markup, and locally generated PNG/SVG QR codes.
- Existing permission-aware Platform Admin, Tenant Admin, Member navigation and member workspace switcher retained; Tenant Admin navigation now uses Community Settings, Share Community, and Create From My Content.
- Create From My Content retains tenant-scoped readable sources, versioned drafts, encrypted provider configuration, and Content Library saves; output/source vocabulary is expanded.
- Memberships now retain external purchase/shop/booking/contact details and clearly show Payment Setup Required when native payments are unavailable.
- Five explicit server-only payment flags keep platform billing, Connect, checkout, paid memberships, and product payments disabled independently.
- Migration 0044 is additive and contains RLS policies; no demo or customer records are created.

## Manual production checklist

Apply migration 0044 and run the full schema verifier first. Then complete the 35 checks from the approved brief: verify AI at Work identity in both admin/member headers, publish and open the public URL incognito, confirm drafts/private content remain hidden, exercise QR/link/button output, enter and leave Member Home without logout, verify member navigation, capture a free-resource lead and inspect delivery, generate and save an AI draft, configure a paid membership plus external link, prove checkout remains disabled, and review Vercel/Supabase logs for isolation failures.

Also verify `/api/health`, sign-in/reset/invitations, Resend delivery, tenant-host routing, terms/privacy/refund/accessibility links, keyboard/mobile behavior, and cross-tenant authorization with production-safe test identities.

## Rollback

Roll back the application deployment to the previous immutable release. Keep migration 0044 installed: it is additive and retaining its audit/lead records is safer than destructive SQL rollback. Disable public pages by setting `publication_status='unpublished'` or `visibility='paused'`. Keep every payment flag false. If a slug change caused routing trouble, restore the prior slug through the authorized settings workflow and verify the managed-domain record and canonical redirect.

## Known issues and deferred integrations

- Public-page section drag-and-drop, referral commissions, social publishing APIs, native product checkout, automated payouts, automatic custom-domain provisioning, and a live virus-scanning provider remain deferred.
- Large native audio/video uploads are not required in beta; supported external media links remain the preferred path.
- Production migration, live evidence, Platform Owner approval, and deployment are not performed by this local change.
- `npm audit --omit=dev` reports three high-severity transitive advisories in Next.js dependencies (`postcss` and `sharp`). npm only offers a forced Next.js 16 upgrade, so this milestone does not apply that breaking framework change; it requires a separately tested dependency-upgrade decision before production approval.
- The desktop skip-link check passes. Playwright's iPhone-emulated Chromium run does not move focus to the skip link after synthetic `Tab`; this remains a mobile-emulation accessibility-test issue requiring device/browser validation. The unauthenticated API regression found during the same run was corrected and its focused Chromium test passes.
