import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveEmailProvider } from "@/lib/communications/configuration";
import { resolveEligibleRecipients } from "@/lib/communications/audience";
import { createPreferenceToken } from "@/lib/communications/tokens";
import { recordCommunicationUsage } from "@/lib/communications/operations";
import { renderBrandedEmail } from "@/lib/communications/branding";

export async function processCampaign(admin: SupabaseClient, tenantId: string, campaignId: string, origin: string) {
  const { data: campaign } = await admin.from("email_campaigns").select("*").eq("id", campaignId).eq("tenant_id", tenantId).single();
  if (!campaign) return { error: "Campaign not found.", httpStatus: 404 };
  if (!campaign.subject?.trim() || (!campaign.html_content?.trim() && !campaign.plain_text_content?.trim())) return { error: "A subject and email body are required.", httpStatus: 400 };
  if (campaign.message_type !== "marketing") return { error: "Campaigns must be classified as marketing email.", httpStatus: 400 };
  const provider = await getActiveEmailProvider(admin, tenantId);
  if (!provider) return { error: "Connect and test an email provider before sending.", httpStatus: 400 };
  const recipients = await resolveEligibleRecipients({
    tenantId,
    audienceType: campaign.audience_type,
    audienceIds: Array.isArray(campaign.audience_ids) ? campaign.audience_ids : [],
    marketing: true
  });
  if (!recipients.length) return { error: "No eligible recipients match this campaign audience.", httpStatus: 400 };
  const idempotencyKey = campaign.idempotency_key || randomUUID();
  const { data: locked } = await admin.from("email_campaigns").update({
    status: "processing", processing_started_at: new Date().toISOString(), idempotency_key: idempotencyKey
  }).eq("id", campaign.id).eq("tenant_id", tenantId).in("status", ["draft", "scheduled", "failed"]).select("id").maybeSingle();
  if (!locked) return { error: "This campaign is already processing or has been sent.", httpStatus: 409 };
  let accepted = 0;
  for (const recipient of recipients) {
    const token = createPreferenceToken({ tenantId, userId: recipient.userId, email: recipient.email });
    const unsubscribe = `${origin}/communications/unsubscribe?token=${encodeURIComponent(token)}`;
    const html = await renderBrandedEmail(admin, tenantId, `${campaign.html_content}<p style="font-size:12px;color:#6b7280">Sent by this organization. <a href="${unsubscribe}">Manage preferences or unsubscribe</a>.</p>`);
    const result = await provider.adapter.sendCampaignEmail({
      fromName: provider.config.from_name, fromEmail: provider.config.from_email, replyTo: provider.config.reply_to_email,
      to: [recipient.email], subject: campaign.subject, html,
      text: `${campaign.plain_text_content}\n\nManage preferences or unsubscribe: ${unsubscribe}`
    });
    await admin.from("email_campaign_recipients").upsert({
      tenant_id: tenantId, campaign_id: campaign.id, user_id: recipient.userId, email: recipient.email,
      status: result.accepted ? "accepted" : "failed", provider_message_id: result.providerMessageId,
      attempted_at: new Date().toISOString(), failed_at: result.accepted ? null : new Date().toISOString(), failure_reason: result.error
    }, { onConflict: "campaign_id,email" });
    if (result.accepted) accepted += 1;
  }
  const finalStatus = accepted === recipients.length ? "sent" : accepted ? "partially_sent" : "failed";
  await admin.from("email_campaigns").update({ status: finalStatus, sent_at: accepted ? new Date().toISOString() : null }).eq("id", campaign.id);
  await recordCommunicationUsage(admin, tenantId, {
    attempted: recipients.length,
    accepted,
    campaignsSent: accepted > 0 ? 1 : 0
  });
  return { attempted: recipients.length, accepted, status: finalStatus };
}
