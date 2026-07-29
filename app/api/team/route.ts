import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInvitationToken,
  invitationExpiresAt,
  teamRoleKeys
} from "@/lib/team-invitations";
import {
  deliverTeamInvitation,
  findAuthUserByEmail
} from "@/lib/team-invitation-delivery";

const inviteSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  role: z.enum(teamRoleKeys),
  personalMessage: z.string().trim().max(1000).optional(),
  sendEmail: z.boolean().default(true)
});

const updateSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("membership"),
    membershipId: z.string().uuid(),
    action: z.enum(["role", "deactivate", "reactivate", "remove"]),
    role: z.enum(teamRoleKeys).optional()
  }),
  z.object({
    target: z.literal("invitation"),
    invitationId: z.string().uuid(),
    action: z.literal("role"),
    role: z.enum(teamRoleKeys)
  })
]);

async function audit(
  tenantId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, unknown> = {}
) {
  await createAdminClient().from("audit_logs").insert({
    tenant_id: tenantId,
    user_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
}

export async function GET() {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const admin = createAdminClient();
  await admin
    .from("tenant_invitations")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("tenant_id", context.tenant.id)
    .in("status", ["pending", "sent"])
    .lte("expires_at", new Date().toISOString());
  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    admin
      .from("tenant_memberships")
      .select(
        "id,user_id,role,status,created_at,updated_at,joined_at,last_active_at,deactivated_at"
      )
      .eq("tenant_id", context.tenant.id)
      .not("role", "in", '("member","guest")')
      .order("created_at"),
    admin
      .from("tenant_invitations")
      .select(
        "id,email,first_name,last_name,role,status,expires_at,created_at,sent_at,failed_at,delivery_error"
      )
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
  ]);
  const people = await Promise.all(
    (memberships ?? []).map(async (membership) => {
      const [{ data: auth }, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(membership.user_id),
        admin
          .from("profiles")
          .select("full_name")
          .eq("id", membership.user_id)
          .maybeSingle()
      ]);
      return {
        ...membership,
        email: auth.user?.email || "",
        name:
          profile?.full_name ||
          auth.user?.user_metadata?.full_name ||
          auth.user?.email ||
          "Team member",
        last_sign_in_at: auth.user?.last_sign_in_at
      };
    })
  );
  return NextResponse.json({
    people,
    invitations: invitations ?? [],
    currentUserId: context.user.id
  });
}

export async function POST(request: NextRequest) {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the invitation fields." },
      { status: 400 }
    );
  }
  const admin = createAdminClient();
  const input = parsed.data;
  const email = input.email.toLowerCase();
  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    const { data: existingMembership } = await admin
      .from("tenant_memberships")
      .select("id,status")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (existingMembership) {
      return NextResponse.json(
        {
          error:
            existingMembership.status === "active"
              ? "This user is already on the team."
              : "This user already has inactive access. Reactivate them from Team Members."
        },
        { status: 409 }
      );
    }
  }
  const { data: duplicate } = await admin
    .from("tenant_invitations")
    .select("id")
    .eq("tenant_id", context.tenant.id)
    .eq("email", email)
    .in("status", ["pending", "sent"])
    .maybeSingle();
  if (duplicate) {
    return NextResponse.json(
      { error: "An active invitation already exists for this email." },
      { status: 409 }
    );
  }
  const { token, tokenHash } = createInvitationToken();
  const expiresAt = invitationExpiresAt();
  const { data: invitation, error: insertError } = await admin
    .from("tenant_invitations")
    .insert({
      tenant_id: context.tenant.id,
      email,
      first_name: input.firstName,
      last_name: input.lastName,
      role: input.role,
      personal_message: input.personalMessage || null,
      token_hash: tokenHash,
      status: "pending",
      send_email: input.sendEmail,
      invited_by: context.user.id,
      invited_user_id: existingUser?.id,
      expires_at: expiresAt
    })
    .select("id")
    .single();
  if (insertError || !invitation) {
    return NextResponse.json(
      { error: "Unable to create the invitation." },
      { status: 500 }
    );
  }
  const origin = new URL(request.url).origin;
  const acceptUrl = `${origin}/invite/accept?token=${encodeURIComponent(token)}`;
  if (!input.sendEmail) {
    await audit(
      context.tenant.id,
      context.user.id,
      "tenant.invitation.created",
      "tenant_invitation",
      invitation.id,
      { email, role: input.role, delivery: "not_requested" }
    );
    return NextResponse.json({
      invited: true,
      status: "pending",
      invitationLink: acceptUrl
    });
  }
  const delivery = await deliverTeamInvitation({
    tenantId: context.tenant.id,
    tenantName: context.tenant.name,
    email,
    firstName: input.firstName,
    personalMessage: input.personalMessage,
    acceptUrl
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
    .eq("tenant_id", context.tenant.id);
  await audit(
    context.tenant.id,
    context.user.id,
    delivery.accepted
      ? "tenant.invitation.sent"
      : "tenant.invitation.delivery_failed",
    "tenant_invitation",
    invitation.id,
    {
      email,
      role: input.role,
      delivery: "delivery" in delivery ? delivery.delivery : "failed"
    }
  );
  if (!delivery.accepted) {
    return NextResponse.json(
      { error: delivery.error || "The invitation was not delivered." },
      { status: 424 }
    );
  }
  return NextResponse.json({ invited: true, status: "sent" });
}

export async function PATCH(request: NextRequest) {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid team action." }, { status: 400 });
  }
  const admin = createAdminClient();
  if (parsed.data.target === "invitation") {
    const { data, error } = await admin
      .from("tenant_invitations")
      .update({
        role: parsed.data.role,
        updated_at: new Date().toISOString()
      })
      .eq("id", parsed.data.invitationId)
      .eq("tenant_id", context.tenant.id)
      .in("status", ["pending", "sent", "failed"])
      .select("id")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json(
        { error: "Active invitation not found." },
        { status: 404 }
      );
    }
    await audit(
      context.tenant.id,
      context.user.id,
      "tenant.invitation.role_changed",
      "tenant_invitation",
      data.id,
      { role: parsed.data.role }
    );
    return NextResponse.json({ updated: true });
  }

  const { data: membership } = await admin
    .from("tenant_memberships")
    .select("id,user_id,role,status")
    .eq("id", parsed.data.membershipId)
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }
  if (membership.role === "tenant_owner") {
    return NextResponse.json(
      { error: "Tenant Owner access cannot be changed from this screen." },
      { status: 409 }
    );
  }
  if (
    membership.user_id === context.user.id &&
    ["deactivate", "remove"].includes(parsed.data.action)
  ) {
    return NextResponse.json(
      { error: "You cannot remove your own active administrator access." },
      { status: 409 }
    );
  }
  const now = new Date().toISOString();
  let error: { message: string } | null = null;
  if (parsed.data.action === "remove") {
    ({ error } = await admin
      .from("tenant_memberships")
      .delete()
      .eq("id", membership.id)
      .eq("tenant_id", context.tenant.id));
  } else {
    const values =
      parsed.data.action === "role"
        ? { role: parsed.data.role, updated_at: now }
        : parsed.data.action === "deactivate"
          ? { status: "inactive", deactivated_at: now, updated_at: now }
          : { status: "active", deactivated_at: null, updated_at: now };
    ({ error } = await admin
      .from("tenant_memberships")
      .update(values)
      .eq("id", membership.id)
      .eq("tenant_id", context.tenant.id));
  }
  if (error) {
    return NextResponse.json(
      { error: "Unable to update team access." },
      { status: 500 }
    );
  }
  await audit(
    context.tenant.id,
    context.user.id,
    `tenant.team_member.${parsed.data.action}`,
    "tenant_membership",
    membership.id,
    { previous_role: membership.role, role: parsed.data.role }
  );
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: NextRequest) {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const invitationId = request.nextUrl.searchParams.get("invitationId");
  if (!invitationId || !z.string().uuid().safeParse(invitationId).success) {
    return NextResponse.json(
      { error: "A valid invitation is required." },
      { status: 400 }
    );
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", invitationId)
    .eq("tenant_id", context.tenant.id)
    .in("status", ["pending", "sent", "failed"])
    .select("id")
    .maybeSingle();
  if (!data) {
    return NextResponse.json(
      { error: "Active invitation not found." },
      { status: 404 }
    );
  }
  await audit(
    context.tenant.id,
    context.user.id,
    "tenant.invitation.revoked",
    "tenant_invitation",
    data.id
  );
  return NextResponse.json({ revoked: true });
}

export async function PUT(request: NextRequest) {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const parsed = z
    .object({
      invitationId: z.string().uuid(),
      action: z.enum(["resend", "copy_link"])
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid invitation action is required." },
      { status: 400 }
    );
  }
  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("tenant_invitations")
    .select("id,email,first_name,personal_message,role,status")
    .eq("id", parsed.data.invitationId)
    .eq("tenant_id", context.tenant.id)
    .in("status", ["pending", "sent", "failed", "expired"])
    .maybeSingle();
  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found or cannot be reused." },
      { status: 404 }
    );
  }
  const { token, tokenHash } = createInvitationToken();
  const expiresAt = invitationExpiresAt();
  const acceptUrl = `${new URL(request.url).origin}/invite/accept?token=${encodeURIComponent(token)}`;
  if (parsed.data.action === "copy_link") {
    await admin
      .from("tenant_invitations")
      .update({
        token_hash: tokenHash,
        status: "pending",
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq("id", invitation.id)
      .eq("tenant_id", context.tenant.id);
    await audit(
      context.tenant.id,
      context.user.id,
      "tenant.invitation.link_rotated",
      "tenant_invitation",
      invitation.id
    );
    return NextResponse.json({ invitationLink: acceptUrl });
  }
  const delivery = await deliverTeamInvitation({
    tenantId: context.tenant.id,
    tenantName: context.tenant.name,
    email: invitation.email,
    firstName: invitation.first_name,
    personalMessage: invitation.personal_message,
    acceptUrl
  });
  const now = new Date().toISOString();
  await admin
    .from("tenant_invitations")
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: delivery.accepted ? "sent" : "failed",
      sent_at: delivery.accepted ? now : null,
      failed_at: delivery.accepted ? null : now,
      delivery_error: delivery.accepted ? null : delivery.error,
      invited_user_id:
        ("invitedUserId" in delivery ? delivery.invitedUserId : undefined) ||
        null,
      updated_at: now
    })
    .eq("id", invitation.id)
    .eq("tenant_id", context.tenant.id);
  await audit(
    context.tenant.id,
    context.user.id,
    delivery.accepted
      ? "tenant.invitation.resent"
      : "tenant.invitation.delivery_failed",
    "tenant_invitation",
    invitation.id
  );
  if (!delivery.accepted) {
    return NextResponse.json(
      { error: delivery.error || "The invitation was not delivered." },
      { status: 424 }
    );
  }
  return NextResponse.json({ resent: true });
}
