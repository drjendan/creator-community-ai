import { createHash, randomBytes } from "node:crypto";

export const teamRoleOptions = [
  ["tenant_admin", "Tenant administrator"],
  ["communication_manager", "Communication manager"],
  ["content_manager", "Content manager"],
  ["course_manager", "Course manager"],
  ["event_manager", "Event manager"],
  ["community_manager", "Community manager"],
  ["analyst", "Report viewer"],
  ["support_staff", "Support staff"]
] as const;

export const teamRoleKeys = [
  "tenant_admin",
  "communication_manager",
  "content_manager",
  "course_manager",
  "event_manager",
  "community_manager",
  "analyst",
  "support_staff"
] as const;

export function createInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt(now = Date.now()) {
  return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export function invitationCanBeAccepted(values: {
  status: string;
  expiresAt: string;
  invitationEmail: string;
  userEmail?: string | null;
}) {
  if (!["pending", "sent"].includes(values.status)) {
    return { valid: false, reason: "This invitation is no longer active." };
  }
  if (new Date(values.expiresAt).getTime() <= Date.now()) {
    return { valid: false, reason: "This invitation has expired." };
  }
  if (
    !values.userEmail ||
    values.invitationEmail.toLowerCase() !== values.userEmail.toLowerCase()
  ) {
    return {
      valid: false,
      reason: "Sign in with the email address that received this invitation."
    };
  }
  return { valid: true };
}
