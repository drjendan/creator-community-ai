import "server-only";

import { getActiveEmailProvider } from "@/lib/communications/configuration";
import { ResendEmailProviderAdapter } from "@/lib/communications/provider";
import { createAdminClient } from "@/lib/supabase/admin";

type InvitationMessage = {
  tenantId: string;
  tenantName: string;
  email: string;
  firstName?: string;
  personalMessage?: string;
  acceptUrl: string;
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
    subject: `You are invited to join ${values.tenantName} on UpNexx`,
    html: `<p>${greeting}</p><p>You have been invited to join <strong>${values.tenantName}</strong>.</p>${personalMessage}<p><a href="${values.acceptUrl}">Accept invitation</a></p><p>This secure link expires in seven days and can be used only once.</p>`,
    text: `${greeting}\n\nYou have been invited to join ${values.tenantName}.\n\n${values.personalMessage || ""}\n\nAccept invitation: ${values.acceptUrl}\n\nThis secure link expires in seven days and can be used only once.`
  };
}

export async function deliverTeamInvitation(values: InvitationMessage) {
  const admin = createAdminClient();
  const existingUser = await findAuthUserByEmail(values.email);
  if (!existingUser) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      values.email,
      {
        redirectTo: values.acceptUrl,
        data: { tenant_id: values.tenantId }
      }
    );
    if (error || !data.user) {
      return {
        accepted: false,
        error: error?.message || "The authentication service could not deliver the invitation."
      };
    }
    return {
      accepted: true,
      delivery: "supabase",
      invitedUserId: data.user.id
    };
  }

  const content = invitationContent(values);
  const tenantProvider = await getActiveEmailProvider(admin, values.tenantId);
  if (tenantProvider) {
    const result = await tenantProvider.adapter.sendTransactionalEmail({
      fromName: tenantProvider.config.from_name,
      fromEmail: tenantProvider.config.from_email,
      replyTo: tenantProvider.config.reply_to_email,
      to: [values.email],
      ...content
    });
    return {
      ...result,
      delivery: "tenant_resend",
      invitedUserId: existingUser.id
    };
  }

  const apiKey = process.env.PLATFORM_RESEND_API_KEY;
  const fromEmail = process.env.PLATFORM_INVITATION_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return {
      accepted: false,
      error:
        "No invitation email provider is configured. Connect the tenant Resend provider or configure PLATFORM_RESEND_API_KEY and PLATFORM_INVITATION_FROM_EMAIL."
    };
  }
  const result = await new ResendEmailProviderAdapter(apiKey).sendTransactionalEmail({
    fromName: process.env.PLATFORM_INVITATION_FROM_NAME || "UpNexx",
    fromEmail,
    to: [values.email],
    ...content
  });
  return {
    ...result,
    delivery: "platform_resend",
    invitedUserId: existingUser.id
  };
}
