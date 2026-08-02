import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken } from "@/lib/team-invitations";
import { trialMutationError } from "@/lib/trials";

export async function POST(request: NextRequest) {
  const parsed = z
    .object({ token: z.string().min(32).max(500) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "The invitation link is invalid." },
      { status: 400 }
    );
  }
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json(
      { error: "Sign in with the invited email address to continue." },
      { status: 401 }
    );
  }
  const admin = createAdminClient();
  const tokenHash = hashInvitationToken(parsed.data.token);
  const { data: invitation } = await admin
    .from("tenant_invitations")
    .select("id,tenant_id,first_name,last_name,role")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (invitation?.tenant_id) {
    const { count: activeOwnerCount } = await admin
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", invitation.tenant_id)
      .eq("role", "tenant_owner")
      .eq("status", "active");
    const restoringMissingOwner =
      invitation.role === "tenant_owner" && Number(activeOwnerCount ?? 0) === 0;
    if (!restoringMissingOwner) {
      const trialError = await trialMutationError(invitation.tenant_id, "invitation");
      if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
    }
  }
  const { data, error } = await admin.rpc("accept_tenant_invitation", {
    supplied_token_hash: tokenHash,
    accepting_user_id: user.id,
    accepting_email: user.email
  });
  if (error || !data?.[0]) {
    const message = error?.message || "";
    const friendly = message.includes("expired_invitation")
      ? "This invitation has expired."
      : message.includes("invitation_email_mismatch")
        ? "Sign in with the email address that received this invitation."
        : message.includes("inactive_invitation")
          ? "This invitation has already been accepted or revoked."
          : "The invitation link is invalid.";
    return NextResponse.json({ error: friendly }, { status: 409 });
  }
  const fullName = [invitation?.first_name, invitation?.last_name]
    .filter(Boolean)
    .join(" ");
  if (fullName) {
    await admin
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName }, { onConflict: "id" });
  }
  await Promise.all([
    admin.from("audit_logs").insert({
      tenant_id: data[0].tenant_id,
      user_id: user.id,
      action: "tenant.invitation.accepted",
      entity_type: "tenant_membership",
      metadata: { invitation_id: invitation?.id }
    }),
    admin.from("tenant_access_history").insert({
      tenant_id: data[0].tenant_id,
      invitation_id: invitation?.id,
      target_user_id: user.id,
      actor_id: user.id,
      action: "tenant.invitation.accepted",
      entity_type: "tenant_invitation",
      entity_id: invitation?.id,
      metadata: { role: invitation?.role }
    })
  ]);
  return NextResponse.json({
    accepted: true,
    tenantSlug: data[0].tenant_slug
  });
}
