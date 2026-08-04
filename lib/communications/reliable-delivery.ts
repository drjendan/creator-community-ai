import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { EmailMessage, EmailSendResult } from "@/lib/communications/provider";
import { ResendEmailProviderAdapter } from "@/lib/communications/provider";
import { getActiveEmailProvider } from "@/lib/communications/configuration";
import { openPayload, sealPayload } from "@/lib/security/sealed-payload";
import { createAdminClient } from "@/lib/supabase/admin";

type Payload = { providerScope: "platform" | "tenant_fallback_platform"; tenantId?: string; message: EmailMessage };
type DeliveryInput = Payload & { category: "tenant_invitation" | "platform_invitation" | "access_change" | "account_security" | "lead_resource"; sourceType?: "tenant_invitation" | "platform_invitation" | "tenant_membership" | "platform_administrator" | "community_lead"; sourceId?: string; idempotencyKey?: string };
type DeliveryRow = { id: string; tenant_id?: string; source_type?: string; source_id?: string; encrypted_payload: string; attempts: number; max_attempts: number };

function platformProvider() {
  const apiKey = process.env.PLATFORM_RESEND_API_KEY || process.env.RESEND_API_KEY;
  return apiKey ? new ResendEmailProviderAdapter(apiKey) : null;
}
function hint(email: string) { const [local, domain = ""] = email.toLowerCase().split("@"); return `${local.slice(0, 2)}***@${domain}`; }
function safeError(error?: string) { return (error || "Notification provider did not accept the message.").slice(0, 1000); }

async function reconcileAccepted(row: DeliveryRow) {
  if (!row.source_id || !row.source_type) return;
  const admin = createAdminClient(); const now = new Date().toISOString();
  if (row.source_type === "tenant_invitation") await admin.from("tenant_invitations").update({ status: "sent", sent_at: now, failed_at: null, delivery_error: null }).eq("id", row.source_id);
  if (row.source_type === "platform_invitation") await admin.from("platform_invitations").update({ status: "pending", sent_at: now, failed_at: null, delivery_error: null, updated_at: now }).eq("id", row.source_id);
}

export async function processTransactionalDelivery(row: DeliveryRow): Promise<EmailSendResult & { queued?: boolean }> {
  const admin = createAdminClient(); let payload: Payload;
  try { payload = openPayload<Payload>(row.encrypted_payload); } catch { await admin.from("transactional_notification_deliveries").update({ status: "failed", last_error: "The encrypted delivery payload could not be opened.", locked_at: null, updated_at: new Date().toISOString() }).eq("id", row.id); return { accepted: false, error: "The queued notification payload is unavailable." }; }
  let adapter = platformProvider();
  if (payload.providerScope === "tenant_fallback_platform" && payload.tenantId) {
    const tenantProvider = await getActiveEmailProvider(admin, payload.tenantId);
    if (tenantProvider) {
      adapter = tenantProvider.adapter;
      payload.message = { ...payload.message, fromName: tenantProvider.config.from_name, fromEmail: tenantProvider.config.from_email, replyTo: tenantProvider.config.reply_to_email };
    }
  }
  const result = adapter ? await adapter.sendTransactionalEmail(payload.message) : { accepted: false, error: "No transactional email provider is configured." };
  const now = new Date();
  if (result.accepted) { await admin.from("transactional_notification_deliveries").update({ status: "accepted", provider_message_id: result.providerMessageId ?? null, accepted_at: now.toISOString(), last_error: "", locked_at: null, updated_at: now.toISOString() }).eq("id", row.id); await reconcileAccepted(row); return result; }
  const terminal = row.attempts >= row.max_attempts; const delayMinutes = Math.min(2 ** Math.max(row.attempts, 1), 60);
  await admin.from("transactional_notification_deliveries").update({ status: terminal ? "failed" : "retry_scheduled", last_error: safeError(result.error), next_attempt_at: new Date(now.getTime() + delayMinutes * 60000).toISOString(), locked_at: null, updated_at: now.toISOString() }).eq("id", row.id);
  return { ...result, queued: !terminal };
}

export async function deliverReliableTransactionalEmail(input: DeliveryInput) {
  const admin = createAdminClient(); const email = input.message.to[0]?.toLowerCase();
  if (!email) return { accepted: false, error: "A recipient is required." };
  let encryptedPayload: string;
  try { encryptedPayload = sealPayload({ providerScope: input.providerScope, tenantId: input.tenantId, message: input.message } satisfies Payload); } catch { return { accepted: false, error: "Secure notification queue encryption is not configured." }; }
  const idempotencyKey = input.idempotencyKey || `notification:${randomUUID()}`;
  const { data, error } = await admin.from("transactional_notification_deliveries").upsert({ tenant_id: input.tenantId ?? null, category: input.category, source_type: input.sourceType ?? null, source_id: input.sourceId ?? null, idempotency_key: idempotencyKey, recipient_hash: createHash("sha256").update(email).digest("hex"), recipient_hint: hint(email), encrypted_payload: encryptedPayload }, { onConflict: "idempotency_key", ignoreDuplicates: true }).select("id,tenant_id,source_type,source_id,encrypted_payload,attempts,max_attempts,status").maybeSingle();
  if (error) return { accepted: false, error: "The notification could not be recorded for delivery." };
  const row = data ?? (await admin.from("transactional_notification_deliveries").select("id,tenant_id,source_type,source_id,encrypted_payload,attempts,max_attempts,status").eq("idempotency_key", idempotencyKey).single()).data;
  if (!row) return { accepted: false, error: "The notification delivery record is unavailable." };
  if (row.status === "accepted") return { accepted: true };
  const claimed = await admin.from("transactional_notification_deliveries").update({ status: "processing", attempts: row.attempts + 1, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id).in("status", ["pending", "retry_scheduled"]).select("id,tenant_id,source_type,source_id,encrypted_payload,attempts,max_attempts").maybeSingle();
  return claimed.data ? processTransactionalDelivery(claimed.data) : { accepted: false, queued: true, error: "The notification is already being processed." };
}

export async function processQueuedTransactionalDeliveries(batchSize = 25) {
  const admin = createAdminClient(); const { data, error } = await admin.rpc("claim_transactional_notification_deliveries", { batch_size: batchSize });
  if (error) return { processed: 0, accepted: 0, error: "Unable to claim queued notifications." };
  let accepted = 0; for (const row of (data ?? []) as DeliveryRow[]) { const result = await processTransactionalDelivery(row); if (result.accepted) accepted += 1; }
  return { processed: data?.length ?? 0, accepted };
}
