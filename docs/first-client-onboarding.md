# First client onboarding

## 1. Create the tenant

A Nexx Jenn platform administrator creates the tenant record, chooses a unique slug, selects a platform plan, and records the primary owner.

## 2. Assign a subdomain

Create and verify a `tenant_domains` record such as `client-name.upnexx.com`. Custom domains require DNS instructions, ownership verification, and certificate provisioning.

## 3. Upload branding

Collect approved logo files, colors, typography preferences, description, social links, and email sender details. Store assets under the tenant UUID prefix and save the configuration in `tenant_branding`.

## 4. Invite the tenant administrator

Create a hashed, expiring invitation for the owner email. After registration, accept the invitation and create active membership/role records. Never email raw database identifiers or privileged credentials.

## 5. Configure memberships

Confirm free and paid plan names, prices, benefits, content access, trial/refund rules, and processor account. Create membership plans before accepting payments.

## 6. Add content

Import the podcast feed, validate episode rights, upload selected resources, build the first course or collection, configure community spaces, and schedule initial events.

## 7. Begin billing

Create the platform subscription and customer billing record, then verify the webhook flow in test mode. Member billing begins only after checkout, entitlement, cancellation, and refund flows pass.

## 8. MVP manual work

Tenant creation, DNS verification, branding setup, initial content migration, plan configuration, admin invitations, quality review, and onboarding calls remain manual during the MVP. Record each action in an audit checklist until automation is built.

