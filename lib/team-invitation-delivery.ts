import "server-only";

import { deliverReliableTransactionalEmail } from "@/lib/communications/reliable-delivery";
import { createAdminClient } from "@/lib/supabase/admin";

type InvitationMessage = {
  tenantId: string;
  tenantName: string;
  email: string;
  firstName?: string;
  personalMessage?: string;
  acceptUrl: string;
  reminder?: boolean;
  invitationId?: string;
};

export async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (error) return null;
    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase()
    );
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

function invitationContent(values: InvitationMessage) {
  const greeting = values.firstName ? `Hi ${values.firstName},` : "Hello,";
  const personalMessage = values.personalMessage
    ? `<p>${values.personalMessage.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`
    : "";
  return {
    subject: values.reminder
      ? `Reminder: accept your invitation to ${values.tenantName}`
      : `You are invited to join ${values.tenantName} on UpNexx`,
    html: `<p>${greeting}</p><p>${values.reminder ? "This is a reminder that you have" : "You have"} been invited to join <strong>${values.tenantName}</strong>.</p>${personalMessage}<p><a href="${values.acceptUrl}">Accept invitation</a></p><p>This secure link can be used only once.</p>`,
    text: `${greeting}\n\n${values.reminder ? "This is a reminder that you have" : "You have"} been invited to join ${values.tenantName}.\n\n${values.personalMessage || ""}\n\nAccept invitation: ${values.acceptUrl}\n\nThis secure link can be used only once.`
  };
}

export async function deliverTeamInvitation(values: InvitationMessage) {
  const existingUser = await findAuthUserByEmail(values.email);
  const content = invitationContent(values);
  const result = await deliverReliableTransactionalEmail({
    category: "tenant_invitation", sourceType: "tenant_invitation", sourceId: values.invitationId,
    idempotencyKey: values.invitationId && !values.reminder ? `tenant-invitation:${values.invitationId}:initial` : undefined,
    providerScope: "tenant_fallback_platform", tenantId: values.tenantId,
    message: { fromName: process.env.PLATFORM_INVITATION_FROM_NAME || "UpNexx", fromEmail: process.env.PLATFORM_INVITATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "notifications@upnexx.net", to: [values.email], ...content }
  });
  return {
    ...result,
    delivery: "durable_transactional_queue",
    invitedUserId: existingUser?.id
  };
}
