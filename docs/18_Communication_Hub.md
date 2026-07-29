# UpNexx Communication Hub

## Architecture

Communication Hub is tenant-scoped and email-first. UpNexx stores communication management records while each tenant supplies and pays for its own Resend account. The browser never receives a saved provider secret.

The provider-neutral `EmailProviderAdapter` contract supports connection testing, test email, transactional email, campaign email, sender validation, and provider status. `ResendEmailProviderAdapter` is the first implementation. Future adapters can implement the same contract without changing campaign or provider-settings screens.

## Required environment variables

- `APP_ENCRYPTION_KEY`: existing 32-byte AES-256-GCM key used to encrypt tenant provider credentials.
- `COMMUNICATION_SIGNING_SECRET`: random server-only value of at least 32 characters used for signed preference links.
- `RESEND_WEBHOOK_SECRET`: Resend/Svix webhook signing secret.
- `CRON_SECRET`: Vercel Cron authorization secret.
- Existing Supabase URL, anonymous key, and service-role key.

Tenant Resend API keys are not environment variables. Each tenant administrator saves their own key under Organization Settings → Integrations → Email Provider.

## How to connect Resend

1. Create or open the organization’s Resend account.
2. Add and verify the organization’s sending domain.
3. Create a Resend API key.
4. In UpNexx, open Communication Hub → Email Provider.
5. Enter the API key, sender name, sender email, and optional reply-to address.
6. Save the configuration, run Test connection, then send a test email.
7. Review and customize the tenant’s starter templates.

The key is encrypted with AES-256-GCM before storage. Only its final four characters are returned for recognition. Replacement never reveals the previous value.

## Tenant isolation and permissions

Migration `0009_communication_hub.sql` enables RLS on all Communication Hub tables. Tenant owners, tenant administrators, and communication managers may manage communication records for their active tenant. Members may read only assigned message recipients, eligible published announcements, and their own preferences. Platform administrators must deliberately select a tenant before using tenant configuration surfaces.

Entitlement keys control navigation and direct route availability. Disabling a feature preserves existing records.

Audience segments calculate current recipients from saved tenant-scoped rules. The migration also includes automation foundation tables, but the automation module is deliberately absent from production navigation and the selectable feature catalog. It must remain hidden until step execution, run history, failure, and retry workflows are implemented and tested.

## Campaign and consent lifecycle

Campaigns progress through draft, scheduled, processing, sent/partially sent/failed, canceled, and archived states. Recipient eligibility is calculated from current tenant memberships and the selected audience. Marketing sends exclude tenant suppressions and members who disabled all marketing email.

Every marketing send receives a signed tenant/member preference link. The public preference endpoint validates its HMAC signature and expiry before changing preferences or adding an unsubscribe suppression.

## Scheduling and idempotency

Vercel Cron calls `/api/cron/communications` every five minutes. `CRON_SECRET` authorizes the request. A campaign is atomically moved from draft/scheduled/failed to processing and receives a unique idempotency key before delivery. Already-processing or completed campaigns cannot be processed again.

## Webhooks and reports

Configure Resend to send email events to `/api/webhooks/resend`. The endpoint validates the Svix signature and timestamp, normalizes supported delivery events, deduplicates them by provider event ID, updates recipient state, and adds bounce/complaint/provider suppressions. Reports use only persisted recipient and delivery-event data.

## Adding another email provider

1. Add the provider identifier and provider-specific configuration validation.
2. Implement `EmailProviderAdapter`.
3. Select that adapter server-side from the saved provider configuration.
4. Add provider webhook normalization and signature verification.
5. Add provider contract, credential-security, delivery, and idempotency tests.

Do not call provider APIs from client components and do not return decrypted credentials from an API.
