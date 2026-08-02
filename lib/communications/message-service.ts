import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveEligibleRecipients } from "@/lib/communications/audience";
import { getActiveEmailProvider } from "@/lib/communications/configuration";
import { recordCommunicationUsage } from "@/lib/communications/operations";
import { renderBrandedEmail } from "@/lib/communications/branding";

export async function deliverMessage(
  admin: SupabaseClient,
  tenantId: string,
  messageId: string
) {
  const { data: message } = await admin
    .from("communication_messages")
    .select("*")
    .eq("id", messageId)
    .eq("tenant_id", tenantId)
    .single();
  if (!message) return { error: "Message not found.", httpStatus: 404 };
  if (!["draft", "scheduled"].includes(message.status)) {
    return { error: "This message has already been processed.", httpStatus: 409 };
  }

  const recipients = await resolveEligibleRecipients({
    tenantId,
    audienceType: message.audience_type,
    audienceIds: Array.isArray(message.audience_ids) ? message.audience_ids : [],
    marketing: false
  });
  if (!recipients.length) {
    return { error: "No eligible recipients match this message audience.", httpStatus: 400 };
  }

  const provider = message.send_email_notification
    ? await getActiveEmailProvider(admin, tenantId)
    : null;
  if (message.send_email_notification && !provider) {
    return {
      error: "Connect and test an email provider before sending an email notification.",
      httpStatus: 400
    };
  }
  const emailRecipients = provider
    ? await resolveEligibleRecipients({
        tenantId,
        audienceType: message.audience_type,
        audienceIds: Array.isArray(message.audience_ids)
          ? message.audience_ids
          : [],
        marketing: true,
        category: "direct_messages"
      })
    : [];

  const { error: recipientError } = await admin
    .from("communication_message_recipients")
    .upsert(
      recipients.filter((recipient) => recipient.userId).map((recipient) => ({
        tenant_id: tenantId,
        message_id: message.id,
        user_id: recipient.userId
      })),
      { onConflict: "message_id,user_id", ignoreDuplicates: true }
    );
  if (recipientError) {
    return { error: "Message recipients could not be created.", httpStatus: 500 };
  }

  let accepted = 0;
  if (provider) {
    const safeBody = String(message.body)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\n", "<br>");
    const brandedHtml = await renderBrandedEmail(admin, tenantId, `<p>${safeBody}</p>`);
    for (const recipient of emailRecipients) {
      const result = await provider.adapter.sendCampaignEmail({
        fromName: provider.config.from_name,
        fromEmail: provider.config.from_email,
        replyTo: provider.config.reply_to_email,
        to: [recipient.email],
        subject: message.subject,
        html: brandedHtml,
        text: message.body
      });
      if (result.accepted) accepted += 1;
    }
  }

  const sentAt = new Date().toISOString();
  await admin
    .from("communication_messages")
    .update({ status: "sent", sent_at: sentAt, updated_at: sentAt })
    .eq("id", message.id)
    .eq("tenant_id", tenantId)
    .in("status", ["draft", "scheduled"]);
  if (provider) {
    await recordCommunicationUsage(admin, tenantId, {
      attempted: emailRecipients.length,
      accepted
    });
  }

  return {
    attempted: recipients.filter((recipient) => recipient.userId).length,
    accepted,
    inAppDelivered: recipients.filter((recipient) => recipient.userId).length,
    status: "sent"
  };
}
