import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendAccessChangeEmail } from "@/lib/access-email";
import {
  tenantTeamRoleKeys,
  tenantTeamRoleLabels
} from "@/lib/permissions";
import {
  getPlatformAdministrator,
  hasRecentAuthentication
} from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deliverTeamInvitation,
  findAuthUserByEmail
} from "@/lib/team-invitation-delivery";
import { invitationExpiresAt } from "@/lib/team-invitations";
import { trialMutationError } from "@/lib/trials";

const managedRoleKeys = ["tenant_owner", ...tenantTeamRoleKeys] as const;
type ManagedTenantRole = (typeof managedRoleKeys)[number];

const inviteSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(managedRoleKeys),
  personalMessage: z.string().trim().max(1000).optional()
});

const updateSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("membership"),
    membershipId: z.string().uuid(),
    action: z.enum(["role", "deactivate", "reactivate", "remove"]),
    role: z.enum(managedRoleKeys).optional()
  }),
  z.object({
    target: z.literal("invitation"),
    invitationId: z.string().uuid(),
    action: z.literal("role"),
    role: z.enum(managedRoleKeys)
  })
]);

function applicationOrigin(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

function invitationToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex")
  };
}

function roleLabel(role: ManagedTenantRole) {
  return tenantTeamRoleLabels[role];
}

async function tenantRecord(tenantId: string) {
  return createAdminClient()
    .from("tenants")
    .select("id,name,status")
    .eq("id", tenantId)
    .neq("status", "deleted")
    .maybeSingle();
}

async function audit(
  tenantId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminClient();
  const historyMetadata = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => key !== "email")
  );
  const targetUserId = typeof metadata.user_id === "string" ? metadata.user_id : null;
  await Promise.all([
    admin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata
    }),
    admin.from("tenant_access_history").insert({
      tenant_id: tenantId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      membership_id: entityType === "tenant_membership" ? entityId : null,
      invitation_id: entityType === "tenant_invitation" ? entityId : null,
      target_user_id: targetUserId,
      metadata: historyMetadata
    })
  ]);
}

async function rateLimited(
  tenantId: string,
  actorId: string,
  action: string,
  limit: number
) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await createAdminClient()
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("user_id", actorId)
    .eq("action", action)
    .gte("created_at", since);
  return Number(count ?? 0) >= limit;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) return NextResponse.json({ error: "Platform tenant management access is required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid tenant is required." }, { status: 400 });
  const { data: tenant } = await tenantRecord(id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  const admin = createAdminClient();
  await admin
    .from("tenant_invitations")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("tenant_id", id)
    .in("status", ["pending", "sent"])
    .lte("expires_at", new Date().toISOString());

  const [{ data: memberships }, { data: invitations }, { data: history }] = await Promise.all([
    admin
      .from("tenant_memberships")
      .select("id,user_id,role,status,created_at,joined_at,last_active_at,deactivated_at,invited_by")
      .eq("tenant_id", id)
      .in("role", [...managedRoleKeys])
      .order("created_at"),
    admin
      .from("tenant_invitations")
      .select("id,email,first_name,last_name,role,status,expires_at,created_at,sent_at,accepted_at,delivery_error,resend_count")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("tenant_access_history")
      .select("id,action,metadata,created_at")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  const people = await Promise.all((memberships ?? []).map(async (membership) => {
    const [{ data: auth }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(membership.user_id),
      admin.from("profiles").select("full_name").eq("id", membership.user_id).maybeSingle()
    ]);
    return {
      ...membership,
      name: profile?.full_name || auth.user?.user_metadata?.full_name || auth.user?.email || "Tenant team member",
      email: auth.user?.email || "",
      last_login: auth.user?.last_sign_in_at || membership.last_active_at
    };
  }));

  return NextResponse.json({
    tenant,
    people,
    invitations: invitations ?? [],
    history: history ?? [],
    roles: managedRoleKeys.map((role) => ({ role, label: roleLabel(role) }))
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) return NextResponse.json({ error: "Platform tenant management access is required." }, { status: 403 });
  const { id } = await params;
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: "Check the tenant team invitation fields." }, { status: 400 });
  }
  if (parsed.data.role === "tenant_owner" && !hasRecentAuthentication(actor.user)) {
    return NextResponse.json({ error: "Sign in again before granting Tenant Owner access." }, { status: 401 });
  }
  const { data: tenant } = await tenantRecord(id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  const admin = createAdminClient();
  const { count: activeOwnerCount } = await admin
    .from("tenant_memberships")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", id)
    .eq("role", "tenant_owner")
    .eq("status", "active");
  const restoringMissingOwner =
    parsed.data.role === "tenant_owner" && Number(activeOwnerCount ?? 0) === 0;
  if (!restoringMissingOwner) {
    const trialError = await trialMutationError(id, "invitation");
    if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  }
  if (await rateLimited(id, actor.user.id, "platform.tenant_team.invitation_attempted", 10)) {
    return NextResponse.json({ error: "Invitation limit reached. Try again later." }, { status: 429 });
  }

  const existingUser = await findAuthUserByEmail(parsed.data.email);
  if (existingUser) {
    const { data: membership } = await admin
      .from("tenant_memberships")
      .select("id,status")
      .eq("tenant_id", id)
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (membership) {
      return NextResponse.json(
        { error: membership.status === "active" ? "This user is already on the tenant team." : "This user already has inactive access. Reactivate them from Tenant Team." },
        { status: 409 }
      );
    }
  }
  const { data: duplicate } = await admin
    .from("tenant_invitations")
    .select("id")
    .eq("tenant_id", id)
    .eq("email", parsed.data.email)
    .in("status", ["pending", "sent"])
    .maybeSingle();
  if (duplicate) return NextResponse.json({ error: "An active invitation already exists for this email." }, { status: 409 });

  const { token, tokenHash } = invitationToken();
  const { data: invitation, error } = await admin
    .from("tenant_invitations")
    .insert({
      tenant_id: id,
      email: parsed.data.email,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      role: parsed.data.role,
      personal_message: parsed.data.personalMessage || null,
      token_hash: tokenHash,
      status: "pending",
      send_email: true,
      invited_by: actor.user.id,
      invited_user_id: existingUser?.id,
      expires_at: invitationExpiresAt()
    })
    .select("id")
    .single();
  if (error || !invitation) return NextResponse.json({ error: "Unable to create the tenant invitation. Apply migration 0019 if it is not installed." }, { status: 500 });
  await audit(id, actor.user.id, "platform.tenant_team.invitation_attempted", "tenant_invitation", invitation.id, {
    role: parsed.data.role
  });

  const acceptUrl = `${applicationOrigin(request)}/invite/accept?token=${encodeURIComponent(token)}`;
  const delivery = await deliverTeamInvitation({
    tenantId: id,
    tenantName: tenant.name,
    email: parsed.data.email,
    firstName: parsed.data.firstName,
    personalMessage: parsed.data.personalMessage,
    acceptUrl,
    invitationId: invitation.id
  });
  const now = new Date().toISOString();
  await admin
    .from("tenant_invitations")
    .update({
      status: delivery.accepted ? "sent" : "failed",
      sent_at: delivery.accepted ? now : null,
      failed_at: delivery.accepted ? null : now,
      delivery_error: delivery.accepted ? null : delivery.error,
      invited_user_id:
        ("invitedUserId" in delivery ? delivery.invitedUserId : undefined) ||
        existingUser?.id ||
        null,
      updated_at: now
    })
    .eq("id", invitation.id)
    .eq("tenant_id", id);
  await audit(
    id,
    actor.user.id,
    delivery.accepted ? "platform.tenant_team.invitation_sent" : "platform.tenant_team.invitation_failed",
    "tenant_invitation",
    invitation.id,
    {
      role: parsed.data.role,
      delivery: "delivery" in delivery ? delivery.delivery : "failed"
    }
  );
  if (!delivery.accepted) return NextResponse.json({ error: delivery.error || "The invitation was not delivered." }, { status: 424 });
  return NextResponse.json({ invited: true }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) return NextResponse.json({ error: "Platform tenant management access is required." }, { status: 403 });
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: "Invalid tenant team action." }, { status: 400 });
  }
  const admin = createAdminClient();
  if (parsed.data.target === "invitation") {
    if (parsed.data.role === "tenant_owner" && !hasRecentAuthentication(actor.user)) {
      return NextResponse.json({ error: "Sign in again before granting Tenant Owner access." }, { status: 401 });
    }
    const { data: invitation } = await admin
      .from("tenant_invitations")
      .select("id,email,first_name,role,status")
      .eq("tenant_id", id)
      .eq("id", parsed.data.invitationId)
      .in("status", ["pending", "sent", "failed"])
      .maybeSingle();
    if (!invitation) return NextResponse.json({ error: "Active invitation not found." }, { status: 404 });
    const { error } = await admin
      .from("tenant_invitations")
      .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
      .eq("tenant_id", id)
      .eq("id", invitation.id);
    if (error) return NextResponse.json({ error: "Unable to update the invitation role." }, { status: 500 });
    await audit(id, actor.user.id, "platform.tenant_team.invitation_role_changed", "tenant_invitation", invitation.id, {
      previous_role: invitation.role,
      role: parsed.data.role
    });
    const notification = await sendAccessChangeEmail({
      email: invitation.email,
      firstName: invitation.first_name,
      scopeLabel: "tenant invitation",
      action: "role_changed",
      roleLabel: roleLabel(parsed.data.role)
    });
    return NextResponse.json({
      updated: true,
      warning: notification.accepted ? undefined : "Access changed, but the notification email was not delivered."
    });
  }

  const { data: membership } = await admin
    .from("tenant_memberships")
    .select("id,user_id,role,status")
    .eq("tenant_id", id)
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Tenant team member not found." }, { status: 404 });
  const ownerCritical =
    membership.role === "tenant_owner" ||
    (parsed.data.action === "role" && parsed.data.role === "tenant_owner");
  if (ownerCritical && !hasRecentAuthentication(actor.user)) {
    return NextResponse.json({ error: "Sign in again before changing Tenant Owner access." }, { status: 401 });
  }
  const now = new Date().toISOString();
  let mutation;
  if (parsed.data.action === "remove") {
    mutation = await admin.from("tenant_memberships").delete().eq("tenant_id", id).eq("id", membership.id);
  } else {
    const values =
      parsed.data.action === "role"
        ? { role: parsed.data.role, updated_at: now }
        : parsed.data.action === "deactivate"
          ? { status: "inactive", deactivated_at: now, updated_at: now }
          : { status: "active", deactivated_at: null, updated_at: now };
    mutation = await admin.from("tenant_memberships").update(values).eq("tenant_id", id).eq("id", membership.id);
  }
  if (mutation.error) {
    const friendly = mutation.error.message.includes("final_tenant_owner_required")
      ? "The final active Tenant Owner cannot be removed, deactivated, or demoted."
      : "Unable to update tenant team access.";
    return NextResponse.json({ error: friendly }, { status: 409 });
  }

  const auth = await admin.auth.admin.getUserById(membership.user_id);
  const nextRole = (parsed.data.role || membership.role) as ManagedTenantRole;
  let notificationWarning: string | undefined;
  if (auth.data.user?.email) {
    const action =
      parsed.data.action === "role"
        ? "role_changed"
        : parsed.data.action === "deactivate"
          ? "suspended"
          : parsed.data.action === "reactivate"
            ? "restored"
            : "removed";
    const notification = await sendAccessChangeEmail({
      email: auth.data.user.email,
      firstName: String(auth.data.user.user_metadata?.full_name || "").split(" ")[0],
      scopeLabel: "tenant workspace",
      action,
      roleLabel: roleLabel(nextRole)
    });
    if (!notification.accepted) notificationWarning = "Access changed, but the notification email was not delivered.";
  } else {
    notificationWarning = "Access changed, but this account has no notification email.";
  }
  await audit(id, actor.user.id, `platform.tenant_team.member_${parsed.data.action}`, "tenant_membership", membership.id, {
    user_id: membership.user_id,
    previous_role: membership.role,
    role: nextRole,
    previous_status: membership.status
  });
  return NextResponse.json({ updated: true, warning: notificationWarning });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) return NextResponse.json({ error: "Platform tenant management access is required." }, { status: 403 });
  const { id } = await params;
  const parsed = z.object({ invitationId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: "A valid invitation is required." }, { status: 400 });
  }
  if (await rateLimited(id, actor.user.id, "platform.tenant_team.invitation_resent", 5)) {
    return NextResponse.json({ error: "Resend limit reached. Try again later." }, { status: 429 });
  }
  const { data: tenant } = await tenantRecord(id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("tenant_invitations")
    .select("id,email,first_name,personal_message,role,status,resend_count")
    .eq("tenant_id", id)
    .eq("id", parsed.data.invitationId)
    .in("status", ["pending", "sent", "failed", "expired"])
    .maybeSingle();
  if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (invitation.role === "tenant_owner" && !hasRecentAuthentication(actor.user)) {
    return NextResponse.json({ error: "Sign in again before resending a Tenant Owner invitation." }, { status: 401 });
  }
  const { token, tokenHash } = invitationToken();
  const acceptUrl = `${applicationOrigin(request)}/invite/accept?token=${encodeURIComponent(token)}`;
  const delivery = await deliverTeamInvitation({
    tenantId: id,
    tenantName: tenant.name,
    email: invitation.email,
    firstName: invitation.first_name,
    personalMessage: invitation.personal_message,
    acceptUrl,
    reminder: true,
    invitationId: invitation.id
  });
  const now = new Date().toISOString();
  await admin
    .from("tenant_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: invitationExpiresAt(),
      status: delivery.accepted ? "sent" : "failed",
      sent_at: delivery.accepted ? now : null,
      failed_at: delivery.accepted ? null : now,
      delivery_error: delivery.accepted ? null : delivery.error,
      invited_user_id:
        ("invitedUserId" in delivery ? delivery.invitedUserId : undefined) ||
        null,
      resend_count: Number(invitation.resend_count ?? 0) + 1,
      last_resent_at: now,
      updated_at: now
    })
    .eq("tenant_id", id)
    .eq("id", invitation.id);
  await audit(
    id,
    actor.user.id,
    delivery.accepted ? "platform.tenant_team.invitation_resent" : "platform.tenant_team.invitation_failed",
    "tenant_invitation",
    invitation.id
  );
  if (!delivery.accepted) return NextResponse.json({ error: delivery.error || "The invitation was not delivered." }, { status: 424 });
  return NextResponse.json({ resent: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) return NextResponse.json({ error: "Platform tenant management access is required." }, { status: 403 });
  const { id } = await params;
  const invitationId = request.nextUrl.searchParams.get("invitationId");
  if (!z.string().uuid().safeParse(id).success || !invitationId || !z.string().uuid().safeParse(invitationId).success) {
    return NextResponse.json({ error: "A valid invitation is required." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("tenant_id", id)
    .eq("id", invitationId)
    .in("status", ["pending", "sent", "failed"])
    .select("id")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Active invitation not found." }, { status: 404 });
  await audit(id, actor.user.id, "platform.tenant_team.invitation_revoked", "tenant_invitation", data.id);
  return NextResponse.json({ revoked: true });
}
