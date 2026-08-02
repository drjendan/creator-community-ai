import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const parsed = z.object({ token: z.string().min(32).max(500) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The invitation link is invalid." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in with the invited email address to continue." }, { status: 401 });

  const admin = createAdminClient();
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const { data: invitation } = await admin.from("platform_invitations").select("id,role_key").eq("token_hash", tokenHash).maybeSingle();
  const { data, error } = await admin.rpc("accept_platform_invitation", {
    supplied_token_hash: tokenHash,
    accepting_user_id: user.id,
    accepting_email: user.email
  });
  if (error || !data?.[0]) {
    const message = error?.message || "";
    const friendly = message.includes("expired_invitation")
      ? "This platform invitation has expired."
      : message.includes("invitation_email_mismatch")
        ? "Sign in with the email address that received this invitation."
        : message.includes("inactive_invitation")
          ? "This platform invitation was already accepted or revoked."
          : "The platform invitation link is invalid.";
    return NextResponse.json({ error: friendly }, { status: 409 });
  }
  const role = data[0].role_key || invitation?.role_key;
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata ?? {}), platform_role: role }
  });
  await admin.from("audit_logs").insert({
    tenant_id: null,
    user_id: user.id,
    action: "platform.invitation.accepted",
    entity_type: "platform_membership",
    entity_id: data[0].membership_id,
    metadata: { invitation_id: invitation?.id, role }
  });
  return NextResponse.json({ accepted: true });
}
