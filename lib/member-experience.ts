import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPlatformAccess } from "@/lib/platform-context";
import { getTenantPermissionSet } from "@/lib/tenant-context";

export type MemberNotification = {
  id: string;
  title: string;
  body: string | null;
  status: string;
  created_at: string;
};

export type MemberExperienceAccess = {
  user: { id: string; email?: string };
  userLabel: string;
  tenantId: string;
  tenantSlug: string;
  hasTenantMembership: boolean;
  canTenantAdmin: boolean;
  canPlatformAdmin: boolean;
  canManageTenantAsPlatform: boolean;
};

export async function getMemberExperienceAccess(tenantId: string, tenantSlug: string): Promise<MemberExperienceAccess | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const [{ data: membership }, platformAccess] = await Promise.all([
    admin.from("tenant_memberships").select("role,status").eq("tenant_id", tenantId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    getPlatformAccess()
  ]);
  const tenantPermissions = membership ? await getTenantPermissionSet(membership.role) : new Set<string>();
  const canManageTenantAsPlatform = Boolean(platformAccess?.permissions.has("platform.tenants.manage"));

  return {
    user: { id: user.id, email: user.email },
    userLabel: user.user_metadata?.full_name || user.email || "Account",
    tenantId,
    tenantSlug,
    hasTenantMembership: Boolean(membership),
    canTenantAdmin: tenantPermissions.has("tenant.dashboard.view") || canManageTenantAsPlatform,
    canPlatformAdmin: Boolean(platformAccess?.permissions.has("platform.dashboard.view")),
    canManageTenantAsPlatform
  };
}

export async function getMemberHeaderState(tenantId: string, tenantSlug: string) {
  const access = await getMemberExperienceAccess(tenantId, tenantSlug);
  if (!access) return { access: null, notifications: [] as MemberNotification[] };
  if (!access.hasTenantMembership && !access.canManageTenantAsPlatform) return { access, notifications: [] as MemberNotification[] };
  const { data } = await createAdminClient().from("notifications")
    .select("id,title,body,status,created_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(5);
  return { access, notifications: (data ?? []) as MemberNotification[] };
}

export function hasMemberExperienceAuthorization(access: MemberExperienceAccess | null) {
  return Boolean(access && (access.hasTenantMembership || access.canManageTenantAsPlatform));
}
