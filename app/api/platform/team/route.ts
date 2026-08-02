import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { deliverPlatformInvitation, sendAccessChangeEmail } from "@/lib/access-email";
import { findAuthUserByEmail } from "@/lib/team-invitation-delivery";
import {
  platformPermissionKeys,
  platformRoleKeys,
  platformRoleLabels,
  type PlatformRole
} from "@/lib/permissions";
import {
  getPlatformAdministrator,
  hasRecentAuthentication,
  type PlatformAccess
} from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { invitationExpiresAt } from "@/lib/team-invitations";

const invitationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(platformRoleKeys)
});

const updateSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("membership"),
    membershipId: z.string().uuid(),
    action: z.enum(["role", "suspend", "reactivate", "remove"]),
    role: z.enum(platformRoleKeys).optional()
  }),
  z.object({
    target: z.literal("invitation"),
    invitationId: z.string().uuid(),
    action: z.literal("role"),
    role: z.enum(platformRoleKeys)
  })
]);

function tokenPair() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

function applicationOrigin(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

function canGrantRole(actor: PlatformAccess, role: PlatformRole) {
  return role !== "platform_owner" || actor.permissions.has("platform.team.grant_owner");
}

async function history(input: {
  actor: PlatformAccess;
  action: string;
  membershipId?: string;
  invitationId?: string;
  targetUserId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const values = {
    membership_id: input.membershipId,
    invitation_id: input.invitationId,
    target_user_id: input.targetUserId,
    actor_id: input.actor.user.id,
    actor_role: input.actor.role,
    action: input.action,
    before_state: input.before ?? {},
    after_state: input.after ?? {},
    metadata: input.metadata ?? {}
  };
  await Promise.all([
    admin.from("platform_access_history").insert(values),
    admin.from("audit_logs").insert({
      tenant_id: null,
      user_id: input.actor.user.id,
      action: input.action,
      entity_type: input.membershipId ? "platform_membership" : "platform_invitation",
      entity_id: input.membershipId || input.invitationId,
      metadata: {
        acting_role: input.actor.role,
        before: input.before ?? {},
        after: input.after ?? {},
        ...input.metadata
      }
    })
  ]);
}

async function invitationRateLimited(actor: PlatformAccess, action: string, limit: number) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await createAdminClient()
    .from("platform_access_history")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", actor.user.id)
    .eq("action", action)
    .gte("created_at", since);
  return Number(count ?? 0) >= limit;
}

export async function GET() {
  const actor = await getPlatformAdministrator("platform.team.view");
  if (!actor) return NextResponse.json({ error: "Platform team access is required." }, { status: 403 });
  const admin = createAdminClient();
  await admin.from("platform_invitations").update({
    status: "expired",
    updated_at: new Date().toISOString()
  }).eq("status", "pending").lte("expires_at", new Date().toISOString());

  const [{ data: memberships }, { data: invitations }, { data: roles }, { data: rolePermissions }, { data: accessHistory }] = await Promise.all([
    admin.from("platform_memberships").select("*").neq("status", "removed").order("created_at"),
    admin.from("platform_invitations").select("id,email,first_name,last_name,role_key,status,invited_by,expires_at,sent_at,accepted_at,created_at,resend_count,last_resent_at,delivery_error").order("created_at", { ascending: false }),
    admin.from("platform_roles").select("role_key,label,description,status").eq("status", "active").order("label"),
    admin.from("platform_role_permissions").select("role_key,permission_key"),
    actor.permissions.has("platform.audit.view")
      ? admin.from("platform_access_history").select("*").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [] })
  ]);

  const people = await Promise.all((memberships ?? []).map(async (membership) => {
    const [{ data: auth }, { data: profile }, inviter] = await Promise.all([
      admin.auth.admin.getUserById(membership.user_id),
      admin.from("profiles").select("full_name").eq("id", membership.user_id).maybeSingle(),
      membership.invited_by
        ? admin.auth.admin.getUserById(membership.invited_by)
        : Promise.resolve({ data: { user: null }, error: null })
    ]);
    return {
      ...membership,
      name: profile?.full_name || auth.user?.user_metadata?.full_name || auth.user?.email || "Platform team member",
      email: auth.user?.email || "",
      invited_by_label: inviter.data.user?.email || (membership.invited_by ? "Platform team member" : "Bootstrap"),
      last_login: auth.user?.last_sign_in_at || membership.last_active_at
    };
  }));
  const inviterIds = [...new Set((invitations ?? []).map((invitation) => invitation.invited_by).filter(Boolean))];
  const inviterMap = new Map<string, string>();
  await Promise.all(inviterIds.map(async (id) => {
    const { data } = await admin.auth.admin.getUserById(id);
    inviterMap.set(id, data.user?.email || "Platform team member");
  }));

  return NextResponse.json({
    people,
    invitations: (invitations ?? []).map((invitation) => ({
      ...invitation,
      invited_by_label: inviterMap.get(invitation.invited_by) || "Platform team member"
    })),
    roles: roles ?? [],
    rolePermissions: rolePermissions ?? [],
    permissions: platformPermissionKeys,
    history: accessHistory ?? [],
    currentUserId: actor.user.id,
    actorRole: actor.role,
    actorPermissions: [...actor.permissions]
  });
}

export async function POST(request: NextRequest) {
  const actor = await getPlatformAdministrator("platform.team.invite");
  if (!actor) return NextResponse.json({ error: "Platform invitation permission is required." }, { status: 403 });
  const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the invitation fields." }, { status: 400 });
  if (!canGrantRole(actor, parsed.data.role)) return NextResponse.json({ error: "You cannot grant Platform Owner access." }, { status: 403 });
  if (parsed.data.role === "platform_owner" && !hasRecentAuthentication(actor.user)) {
    return NextResponse.json({ error: "Sign in again before granting Platform Owner access." }, { status: 401 });
  }
  if (parsed.data.email === actor.user.email?.toLowerCase()) return NextResponse.json({ error: "You cannot invite or elevate your own account." }, { status: 409 });
  if (await invitationRateLimited(actor, "platform.invitation.attempted", 10)) {
    return NextResponse.json({ error: "Invitation limit reached. Try again later." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: openInvitation } = await admin.from("platform_invitations").select("id").eq("email", parsed.data.email).eq("status", "pending").maybeSingle();
  if (openInvitation) return NextResponse.json({ error: "An active membership or invitation already exists for this address." }, { status: 409 });
  const existingUser = await findAuthUserByEmail(parsed.data.email);
  if (existingUser) {
    const { data: membership } = await admin.from("platform_memberships").select("id,status").eq("user_id", existingUser.id).maybeSingle();
    if (membership && membership.status !== "removed") return NextResponse.json({ error: "An active membership or invitation already exists for this address." }, { status: 409 });
  }

  const { token, tokenHash } = tokenPair();
  const { data: invitation, error } = await admin.from("platform_invitations").insert({
    email: parsed.data.email,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    role_key: parsed.data.role,
    token_hash: tokenHash,
    invited_by: actor.user.id,
    invited_user_id: existingUser?.id,
    expires_at: invitationExpiresAt(),
    status: "pending"
  }).select("id").single();
  if (error || !invitation) return NextResponse.json({ error: "Unable to create the platform invitation." }, { status: 500 });
  await history({
    actor,
    action: "platform.invitation.attempted",
    invitationId: invitation.id,
    after: { role: parsed.data.role, status: "pending" }
  });
  const acceptUrl = `${applicationOrigin(request)}/platform-invite/accept?token=${encodeURIComponent(token)}`;
  const delivery = await deliverPlatformInvitation({
    email: parsed.data.email,
    firstName: parsed.data.firstName,
    roleLabel: platformRoleLabels[parsed.data.role],
    acceptUrl,
    invitationId: invitation.id
  });
  const now = new Date().toISOString();
  await admin.from("platform_invitations").update({
    status: delivery.accepted ? "pending" : "failed",
    sent_at: delivery.accepted ? now : null,
    failed_at: delivery.accepted ? null : now,
    delivery_error: delivery.accepted ? null : delivery.error,
    invited_user_id: delivery.invitedUserId || existingUser?.id || null,
    updated_at: now
  }).eq("id", invitation.id);
  await history({
    actor,
    action: delivery.accepted ? "platform.invitation.created" : "platform.invitation.failed",
    invitationId: invitation.id,
    after: { role: parsed.data.role, status: delivery.accepted ? "pending" : "failed" },
    metadata: { delivery: delivery.delivery || "failed" }
  });
  if (!delivery.accepted) return NextResponse.json({ error: delivery.error || "Unable to deliver the invitation." }, { status: 424 });
  return NextResponse.json({ invited: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid platform team action." }, { status: 400 });
  const permission = parsed.data.action === "role"
    ? "platform.team.manage_roles"
    : parsed.data.action === "suspend" || parsed.data.action === "reactivate"
      ? "platform.team.suspend"
      : "platform.team.remove";
  const actor = await getPlatformAdministrator(permission);
  if (!actor) return NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 });
  if (!hasRecentAuthentication(actor.user)) return NextResponse.json({ error: "Sign in again before changing platform access." }, { status: 401 });
  const admin = createAdminClient();

  if (parsed.data.target === "invitation") {
    if (!canGrantRole(actor, parsed.data.role)) return NextResponse.json({ error: "You cannot grant Platform Owner access." }, { status: 403 });
    const { data: invitation } = await admin
      .from("platform_invitations")
      .select("id,email,first_name,role_key,status")
      .eq("id", parsed.data.invitationId)
      .maybeSingle();
    if (!invitation || !["pending", "failed"].includes(invitation.status)) return NextResponse.json({ error: "Active invitation not found." }, { status: 404 });
    await admin.from("platform_invitations").update({ role_key: parsed.data.role, updated_at: new Date().toISOString() }).eq("id", invitation.id);
    const notification = await sendAccessChangeEmail({
      email: invitation.email,
      firstName: invitation.first_name,
      scopeLabel: "UpNexx platform invitation",
      action: "role_changed",
      roleLabel: platformRoleLabels[parsed.data.role]
    });
    await history({ actor, action: "platform.invitation.role_changed", invitationId: invitation.id, before: { role: invitation.role_key }, after: { role: parsed.data.role } });
    return NextResponse.json({
      updated: true,
      warning: notification.accepted ? undefined : "Access changed, but the notification email was not delivered."
    });
  }

  const { data: membership } = await admin.from("platform_memberships").select("*").eq("id", parsed.data.membershipId).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Platform team member not found." }, { status: 404 });
  if (membership.user_id === actor.user.id && parsed.data.action === "role") return NextResponse.json({ error: "You cannot change your own platform role." }, { status: 409 });
  if (membership.user_id === actor.user.id && ["suspend", "remove"].includes(parsed.data.action)) return NextResponse.json({ error: "You cannot suspend or remove your own access." }, { status: 409 });
  if (parsed.data.action === "role" && (!parsed.data.role || !canGrantRole(actor, parsed.data.role))) return NextResponse.json({ error: "You cannot grant that platform role." }, { status: 403 });

  const now = new Date().toISOString();
  const nextRole = parsed.data.action === "role" ? parsed.data.role! : membership.role_key as PlatformRole;
  const nextStatus = parsed.data.action === "suspend" ? "suspended" : parsed.data.action === "reactivate" ? "active" : parsed.data.action === "remove" ? "removed" : membership.status;
  const { error } = await admin.from("platform_memberships").update({
    role_key: nextRole,
    status: nextStatus,
    suspended_at: parsed.data.action === "suspend" ? now : parsed.data.action === "reactivate" ? null : membership.suspended_at,
    suspended_by: parsed.data.action === "suspend" ? actor.user.id : parsed.data.action === "reactivate" ? null : membership.suspended_by,
    removed_at: parsed.data.action === "remove" ? now : membership.removed_at,
    removed_by: parsed.data.action === "remove" ? actor.user.id : membership.removed_by,
    updated_by: actor.user.id,
    updated_at: now
  }).eq("id", membership.id);
  if (error) {
    const friendly = error.message.includes("final_platform_owner_required")
      ? "The final active Platform Owner cannot be changed."
      : "Unable to update platform access.";
    return NextResponse.json({ error: friendly }, { status: 409 });
  }
  const auth = await admin.auth.admin.getUserById(membership.user_id);
  await admin.auth.admin.updateUserById(membership.user_id, {
    app_metadata: {
      ...(auth.data.user?.app_metadata ?? {}),
      platform_role: nextStatus === "active" ? nextRole : null
    }
  });
  let notificationWarning: string | undefined;
  if (auth.data.user?.email) {
    const emailAction = parsed.data.action === "role" ? "role_changed" : parsed.data.action === "suspend" ? "suspended" : parsed.data.action === "reactivate" ? "restored" : "removed";
    const notification = await sendAccessChangeEmail({
      email: auth.data.user.email,
      firstName: String(auth.data.user.user_metadata?.full_name || "").split(" ")[0],
      scopeLabel: "UpNexx platform",
      action: emailAction,
      roleLabel: platformRoleLabels[nextRole]
    });
    if (!notification.accepted) notificationWarning = "Access changed, but the notification email was not delivered.";
  } else {
    notificationWarning = "Access changed, but this account has no notification email.";
  }
  await history({
    actor,
    action: `platform.team_member.${parsed.data.action}`,
    membershipId: membership.id,
    targetUserId: membership.user_id,
    before: { role: membership.role_key, status: membership.status },
    after: { role: nextRole, status: nextStatus }
  });
  return NextResponse.json({ updated: true, warning: notificationWarning });
}

export async function PUT(request: NextRequest) {
  const actor = await getPlatformAdministrator("platform.team.invite");
  if (!actor) return NextResponse.json({ error: "Platform invitation permission is required." }, { status: 403 });
  const parsed = z.object({ invitationId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid invitation is required." }, { status: 400 });
  if (await invitationRateLimited(actor, "platform.invitation.resent", 5)) return NextResponse.json({ error: "Resend limit reached. Try again later." }, { status: 429 });
  const admin = createAdminClient();
  const { data: invitation } = await admin.from("platform_invitations").select("*").eq("id", parsed.data.invitationId).in("status", ["pending", "failed", "expired"]).maybeSingle();
  if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (!canGrantRole(actor, invitation.role_key)) return NextResponse.json({ error: "You cannot resend this role invitation." }, { status: 403 });
  if (invitation.role_key === "platform_owner" && !hasRecentAuthentication(actor.user)) {
    return NextResponse.json({ error: "Sign in again before resending a Platform Owner invitation." }, { status: 401 });
  }
  const { token, tokenHash } = tokenPair();
  const acceptUrl = `${applicationOrigin(request)}/platform-invite/accept?token=${encodeURIComponent(token)}`;
  const delivery = await deliverPlatformInvitation({
    email: invitation.email,
    firstName: invitation.first_name,
    roleLabel: platformRoleLabels[invitation.role_key as PlatformRole],
    acceptUrl,
    reminder: true,
    invitationId: invitation.id
  });
  const now = new Date().toISOString();
  await admin.from("platform_invitations").update({
    token_hash: tokenHash,
    expires_at: invitationExpiresAt(),
    status: delivery.accepted ? "pending" : "failed",
    sent_at: delivery.accepted ? now : invitation.sent_at,
    failed_at: delivery.accepted ? null : now,
    delivery_error: delivery.accepted ? null : delivery.error,
    resend_count: Number(invitation.resend_count ?? 0) + 1,
    last_resent_at: now,
    updated_at: now
  }).eq("id", invitation.id);
  await history({ actor, action: delivery.accepted ? "platform.invitation.resent" : "platform.invitation.failed", invitationId: invitation.id, metadata: { delivery: delivery.delivery || "failed" } });
  if (!delivery.accepted) return NextResponse.json({ error: delivery.error || "Unable to resend the invitation." }, { status: 424 });
  return NextResponse.json({ resent: true });
}

export async function DELETE(request: NextRequest) {
  const actor = await getPlatformAdministrator("platform.team.invite");
  if (!actor) return NextResponse.json({ error: "Platform invitation permission is required." }, { status: 403 });
  const invitationId = request.nextUrl.searchParams.get("invitationId");
  if (!invitationId || !z.string().uuid().safeParse(invitationId).success) return NextResponse.json({ error: "A valid invitation is required." }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from("platform_invitations").update({
    status: "revoked",
    revoked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", invitationId).in("status", ["pending", "failed"]).select("id").maybeSingle();
  if (!data) return NextResponse.json({ error: "Active invitation not found." }, { status: 404 });
  await history({ actor, action: "platform.invitation.revoked", invitationId: data.id });
  return NextResponse.json({ revoked: true });
}
