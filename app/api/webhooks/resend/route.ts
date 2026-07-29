import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyResendWebhook } from "@/lib/communications/webhook";
import { recordCommunicationUsage } from "@/lib/communications/operations";

const eventMap: Record<string, string> = {
  "email.sent": "sent", "email.delivered": "delivered", "email.delivery_delayed": "delayed",
  "email.opened": "opened", "email.clicked": "clicked", "email.bounced": "bounced",
  "email.complained": "complained", "email.failed": "failed", "email.suppressed": "suppressed"
};

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyResendWebhook(raw, request.headers)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  const payload = JSON.parse(raw) as { type?: string; created_at?: string; data?: { email_id?: string; id?: string } };
  const eventType = payload.type ? eventMap[payload.type] : undefined;
  const providerMessageId = payload.data?.email_id || payload.data?.id;
  const providerEventId = request.headers.get("svix-id");
  if (!eventType || !providerMessageId || !providerEventId) return NextResponse.json({ ignored: true });
  const admin = createAdminClient();
  const { data: recipient } = await admin.from("email_campaign_recipients").select("id,tenant_id,campaign_id,email").eq("provider_message_id", providerMessageId).maybeSingle();
  if (!recipient) return NextResponse.json({ ignored: true });
  const { error: eventError } = await admin.from("communication_delivery_events").insert({
    tenant_id: recipient.tenant_id, campaign_id: recipient.campaign_id, recipient_id: recipient.id,
    provider: "resend", provider_message_id: providerMessageId, provider_event_id: providerEventId,
    event_type: eventType, event_timestamp: payload.created_at || new Date().toISOString(),
    provider_payload_reference: { type: payload.type }
  });
  if (eventError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (eventError) return NextResponse.json({ error: "Unable to record delivery event." }, { status: 500 });
  const update: Record<string, unknown> = { status: eventType };
  if (eventType === "delivered") update.delivered_at = payload.created_at || new Date().toISOString();
  if (["failed", "bounced", "complained", "suppressed"].includes(eventType)) {
    update.failed_at = payload.created_at || new Date().toISOString();
    update.failure_reason = eventType;
  }
  await admin.from("email_campaign_recipients").update(update).eq("id", recipient.id);
  if (eventType === "delivered") {
    await recordCommunicationUsage(admin, recipient.tenant_id, { delivered: 1 });
  }
  if (["bounced", "complained", "suppressed"].includes(eventType)) {
    await admin.from("communication_suppressions").upsert({
      tenant_id: recipient.tenant_id, email: recipient.email,
      reason: eventType === "bounced" ? "hard_bounce" : eventType === "complained" ? "complaint" : "provider_suppressed",
      provider: "resend", updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id,email,reason" });
  }
  return NextResponse.json({ received: true });
}
