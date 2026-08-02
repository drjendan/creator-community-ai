import "server-only";

import { deliverReliableTransactionalEmail } from "@/lib/communications/reliable-delivery";
import { findAuthUserByEmail } from "@/lib/team-invitation-delivery";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function platformSender() {
  const fromEmail = process.env.PLATFORM_INVITATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;
  return fromEmail
    ? {
        fromEmail,
        fromName: process.env.PLATFORM_INVITATION_FROM_NAME || "UpNexx"
      }
    : null;
}

export async function deliverPlatformInvitation(input: {
  email: string;
  firstName: string;
  roleLabel: string;
  acceptUrl: string;
  reminder?: boolean;
  invitationId?: string;
}): Promise<{
  accepted: boolean;
  delivery?: "platform_resend";
  invitedUserId?: string;
  providerMessageId?: string;
  error?: string;
}> {
  const existingUser = await findAuthUserByEmail(input.email);
  const sender = platformSender();
  if (!sender) return { accepted: false, error: "The UpNexx platform email provider is not configured." };
  const greeting = input.firstName ? `Hi ${input.firstName},` : "Hello,";
  const result = await deliverReliableTransactionalEmail({ category: "platform_invitation", sourceType: "platform_invitation", sourceId: input.invitationId, idempotencyKey: input.invitationId && !input.reminder ? `platform-invitation:${input.invitationId}:initial` : undefined, providerScope: "platform", message: {
    fromName: sender.fromName,
    fromEmail: sender.fromEmail,
    to: [input.email],
    subject: input.reminder
      ? "Reminder: accept your UpNexx platform invitation"
      : "You are invited to the UpNexx platform team",
    html: `<p>${escapeHtml(greeting)}</p><p>${input.reminder ? "This is a reminder that you have" : "You have"} been invited to join the UpNexx platform team as <strong>${escapeHtml(input.roleLabel)}</strong>.</p><p><a href="${escapeHtml(input.acceptUrl)}">Accept secure invitation</a></p><p>This single-use link expires on the date shown in your invitation.</p>`,
    text: `${greeting}\n\n${input.reminder ? "This is a reminder that you have" : "You have"} been invited to join the UpNexx platform team as ${input.roleLabel}.\n\nAccept secure invitation: ${input.acceptUrl}\n\nThis single-use link expires on the date shown in your invitation.`
  } });
  return {
    ...result,
    delivery: "platform_resend",
    invitedUserId: existingUser?.id
  };
}

export async function sendAccessChangeEmail(input: {
  email: string;
  firstName?: string;
  scopeLabel: string;
  action: "role_changed" | "suspended" | "restored" | "removed";
  roleLabel?: string;
}) {
  const sender = platformSender();
  if (!sender) return { accepted: false, error: "Platform email is not configured." };
  const descriptions = {
    role_changed: `Your access role is now ${input.roleLabel || "updated"}.`,
    suspended: "Your access has been suspended.",
    restored: "Your access has been restored.",
    removed: "Your access has been removed."
  };
  const description = descriptions[input.action];
  return deliverReliableTransactionalEmail({ category: "access_change", providerScope: "platform", message: {
    fromName: sender.fromName,
    fromEmail: sender.fromEmail,
    to: [input.email],
    subject: `Your ${input.scopeLabel} access was updated`,
    html: `<p>Hi ${escapeHtml(input.firstName || "there")},</p><p>${escapeHtml(description)}</p><p>If you did not expect this change, contact UpNexx Support.</p>`,
    text: `Hi ${input.firstName || "there"},\n\n${description}\n\nIf you did not expect this change, contact UpNexx Support.`
  } });
}
