import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { tenantDeletionBlockers } from "@/lib/tenant-lifecycle";

const ownerOnlyRoles = new Set(["platform_owner"]);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resend_owner_invitation") }),
  z.object({ action: z.literal("send_owner_password_reset") }),
  z.object({ action: z.enum(["suspend", "archive"]), reason: z.string().trim().min(5).max(1000) }),
  z.object({ action: z.enum(["reactivate", "restore"]) }),
  z.object({
    action: z.literal("delete"),
    reason: z.string().trim().min(10).max(1000),
    confirmationName: z.string()
  })
]);

async function platformActor() {
  return getPlatformAdministrator("platform.tenants.manage");
}

async function ownerForTenant(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
  const { data: membership } = await admin
    .from("tenant_memberships")
    .select("user_id,created_at")
    .eq("tenant_id", tenantId)
    .eq("role", "tenant_owner")
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership) return null;
  const [{ data: auth }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(membership.user_id),
    admin.from("profiles").select("full_name").eq("id", membership.user_id).maybeSingle()
  ]);
  if (!auth.user?.email) return null;
  return {
    id: auth.user.id,
    email: auth.user.email,
    name: profile?.full_name || auth.user.user_metadata?.full_name || auth.user.email,
    activated: Boolean(auth.user.email_confirmed_at || auth.user.last_sign_in_at),
    activatedAt: auth.user.email_confirmed_at || auth.user.last_sign_in_at || null,
    membershipCreatedAt: membership.created_at
  };
}

async function audit(admin: ReturnType<typeof createAdminClient>, tenantId: string, userId: string, action: string, metadata: Record<string, unknown> = {}) {
  await admin.from("audit_logs").insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    entity_type: "tenant",
    entity_id: tenantId,
    metadata
  });
}

async function deactivateTenantDomains(admin: ReturnType<typeof createAdminClient>, tenantId: string, userId: string, reason: string, now: string) {
  const { data: activeCustomDomains } = await admin.from("tenant_domains").select("id").eq("tenant_id", tenantId).eq("domain_type", "custom").eq("status", "active");
  await admin.from("tenant_domains").update({ status: "inactive", is_primary: false, canonical_redirect_enabled: false, updated_by: userId, updated_at: now }).eq("tenant_id", tenantId);
  if (activeCustomDomains?.length) {
    await admin.from("tenant_domain_verification_attempts").insert(activeCustomDomains.map((domain) => ({ domain_id: domain.id, tenant_id: tenantId, check_type: "rollback", status: "blocked", evidence_reference: `tenant-lifecycle:${reason}:${now}`, notes: `Custom-domain routing was disabled by tenant ${reason}; this is not a passed rollback rehearsal.`, performed_by: userId })));
    await admin.from("production_readiness_checks").update({ status: "pending", evidence_reference: "", notes: `Custom-domain routing was disabled by tenant ${reason}. Reactivation requires the verified lifecycle.`, verified_by: null, verified_at: null, updated_at: now }).eq("check_key", "custom_domain_verified");
  }
}

async function deletionPreflight(admin: ReturnType<typeof createAdminClient>, tenantId: string) {
  const [
    platformSubscriptions,
    memberSubscriptions,
    unsettledPayments,
    pendingRefunds,
    activeUsers,
    aiIntegrations,
    emailIntegrations,
    tenantFiles,
    brandFiles
  ] = await Promise.all([
    admin.from("tenant_subscriptions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("provider_subscription_id", "is", null).in("status", ["active", "trialing", "past_due"]),
    admin.from("member_subscriptions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("provider_subscription_id", "is", null).in("status", ["active", "trialing", "past_due"]),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["pending", "processing", "requires_action", "disputed"]),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["refund_pending", "pending_refund"]),
    admin.from("tenant_memberships").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
    admin.from("ai_provider_settings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("enabled", true),
    admin.from("tenant_communication_provider_configs").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
    admin.storage.from("tenant-assets").list(tenantId, { limit: 1 }),
    admin.storage.from("brand-assets").list(`tenants/${tenantId}`, { limit: 1 })
  ]);
  const snapshot = {
    activeStripeSubscriptions: (platformSubscriptions.count ?? 0) + (memberSubscriptions.count ?? 0),
    unsettledPayments: unsettledPayments.count ?? 0,
    pendingRefunds: pendingRefunds.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    activeIntegrations: (aiIntegrations.count ?? 0) + (emailIntegrations.count ?? 0),
    tenantOwnedFiles: (tenantFiles.data?.length ?? 0) + (brandFiles.data?.length ?? 0)
  };
  return {
    ...snapshot,
    blockers: tenantDeletionBlockers(snapshot)
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await platformActor();
  if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid tenant." }, { status: 400 });
  const admin = createAdminClient();
  return NextResponse.json({ preflight: await deletionPreflight(admin, id), canDelete: ownerOnlyRoles.has(actor.role) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await platformActor();
  if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: parsed.success ? "Invalid tenant." : parsed.error.issues[0]?.message ?? "Invalid action." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("*").eq("id", id).maybeSingle();
  if (!tenant || tenant.status === "deleted") return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  const input = parsed.data;

  if (input.action === "resend_owner_invitation" || input.action === "send_owner_password_reset") {
    const owner = await ownerForTenant(admin, id);
    if (!owner) return NextResponse.json({ error: "No Tenant Owner account is assigned." }, { status: 404 });
    if (input.action === "resend_owner_invitation" && owner.activated) {
      return NextResponse.json({ error: "This owner account is already active. Send a password reset instead." }, { status: 409 });
    }
    const redirectTo = `${new URL(request.url).origin}/update-password`;
    const result = input.action === "resend_owner_invitation"
      ? await admin.auth.resend({ type: "signup", email: owner.email, options: { emailRedirectTo: redirectTo } })
      : await admin.auth.resetPasswordForEmail(owner.email, { redirectTo });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 502 });
    const now = new Date().toISOString();
    if (input.action === "resend_owner_invitation") {
      await admin.from("tenants").update({
        owner_invited_at: tenant.owner_invited_at || owner.membershipCreatedAt,
        owner_invitation_last_sent_at: now,
        owner_invitation_send_count: Number(tenant.owner_invitation_send_count ?? 0) + 1,
        updated_at: now
      }).eq("id", id);
    }
    await audit(admin, id, actor.user.id, input.action === "resend_owner_invitation" ? "platform.tenant_owner.invitation_resent" : "platform.tenant_owner.password_reset_sent", { owner_user_id: owner.id, owner_email: owner.email });
    return NextResponse.json({ message: input.action === "resend_owner_invitation" ? "Owner invitation resent." : "Password reset email sent." });
  }

  const now = new Date().toISOString();
  if (input.action === "suspend") {
    if (!["active", "pending"].includes(tenant.status)) return NextResponse.json({ error: "Only active or pending tenants can be suspended." }, { status: 409 });
    await admin.from("tenants").update({ status: "suspended", suspended_at: now, suspended_by: actor.user.id, suspension_reason: input.reason, updated_at: now }).eq("id", id);
    await deactivateTenantDomains(admin, id, actor.user.id, "suspension", now);
    await audit(admin, id, actor.user.id, "platform.tenant.suspended", { reason: input.reason, previous_status: tenant.status });
    return NextResponse.json({ message: "Tenant suspended." });
  }
  if (input.action === "reactivate") {
    if (tenant.status !== "suspended") return NextResponse.json({ error: "Only suspended tenants can be reactivated." }, { status: 409 });
    await admin.from("tenants").update({ status: "active", suspended_at: null, suspended_by: null, suspension_reason: null, updated_at: now }).eq("id", id);
    await admin.from("tenant_domains").update({ status: "active", is_primary: true, updated_at: now }).eq("tenant_id", id).eq("domain_type", "upnexx_subdomain");
    await audit(admin, id, actor.user.id, "platform.tenant.reactivated");
    return NextResponse.json({ message: "Tenant reactivated." });
  }
  if (input.action === "archive") {
    if (!["active", "pending", "suspended"].includes(tenant.status)) return NextResponse.json({ error: "This tenant cannot be archived." }, { status: 409 });
    await admin.from("tenants").update({ status: "archived", archived_at: now, archived_by: actor.user.id, updated_at: now }).eq("id", id);
    await deactivateTenantDomains(admin, id, actor.user.id, "archival", now);
    await audit(admin, id, actor.user.id, "platform.tenant.archived", { reason: input.reason, previous_status: tenant.status });
    return NextResponse.json({ message: "Tenant archived." });
  }
  if (input.action === "restore") {
    if (tenant.status !== "archived") return NextResponse.json({ error: "Only archived tenants can be restored." }, { status: 409 });
    await admin.from("tenants").update({ status: "active", archived_at: null, archived_by: null, updated_at: now }).eq("id", id);
    await admin.from("tenant_domains").update({ status: "active", is_primary: true, updated_at: now }).eq("tenant_id", id).eq("domain_type", "upnexx_subdomain");
    await audit(admin, id, actor.user.id, "platform.tenant.restored");
    return NextResponse.json({ message: "Tenant restored." });
  }

  if (input.action !== "delete") return NextResponse.json({ error: "Unsupported tenant action." }, { status: 400 });
  if (!ownerOnlyRoles.has(actor.role)) return NextResponse.json({ error: "Only the Platform Owner can permanently delete a tenant." }, { status: 403 });
  if (input.confirmationName !== tenant.name) return NextResponse.json({ error: "The confirmation name does not exactly match the tenant name." }, { status: 400 });
  const preflight = await deletionPreflight(admin, id);
  if (preflight.blockers.length) return NextResponse.json({ error: preflight.blockers.join(" "), preflight }, { status: 409 });

  await admin.from("platform_tenant_deletion_records").insert({
    tenant_id: id, tenant_name: tenant.name, tenant_slug: tenant.slug,
    deleted_by: actor.user.id, deletion_reason: input.reason, preflight_snapshot: preflight
  });
  await admin.from("tenant_memberships").update({ status: "inactive", deactivated_at: now, updated_at: now }).eq("tenant_id", id);
  await deactivateTenantDomains(admin, id, actor.user.id, "deletion", now);
  await admin.from("tenant_feature_entitlements").update({ enabled: false, updated_at: now }).eq("tenant_id", id);
  await admin.from("tenant_ai_settings").update({ enabled: false, updated_at: now }).eq("tenant_id", id);
  await admin.from("ai_provider_settings").delete().eq("tenant_id", id);
  await admin.from("tenant_communication_provider_configs").delete().eq("tenant_id", id);
  await admin.from("tenant_stripe_accounts").update({ status: "disconnected", charges_enabled: false, payouts_enabled: false, platform_fee_active: false, disconnected_at: now, disconnected_by: actor.user.id, updated_at: now }).eq("tenant_id", id);
  await admin.from("tenants").update({
    status: "deleted", deleted_at: now, deleted_by: actor.user.id,
    deletion_reason: input.reason, updated_at: now
  }).eq("id", id);
  await audit(admin, id, actor.user.id, "platform.tenant.deleted", {
    tenant_id: id, tenant_name: tenant.name, reason: input.reason, retention_mode: "tombstone", preflight
  });
  return NextResponse.json({ message: "Tenant access and integrations were permanently disabled. Retained financial and audit records remain preserved." });
}
