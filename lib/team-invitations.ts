import { createHash, randomBytes } from "node:crypto";
import { tenantTeamRoleKeys, tenantTeamRoleLabels } from "@/lib/permissions";

export const teamRoleOptions = tenantTeamRoleKeys.map((role) => [
  role,
  tenantTeamRoleLabels[role]
] as const);

export const teamRoleKeys = tenantTeamRoleKeys;

export function createInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt(now = Date.now()) {
  const configuredDays = Number(process.env.INVITATION_EXPIRATION_DAYS ?? 7);
  const days = Number.isInteger(configuredDays) && configuredDays >= 1 && configuredDays <= 30
    ? configuredDays
    : 7;
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
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
