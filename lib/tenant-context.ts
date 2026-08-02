import "server-only";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  tenantPermissionKeys,
  tenantRoleHasPermission,
  type TenantPermission
} from "@/lib/permissions";
import { getPlatformAccess } from "@/lib/platform-context";

const managerRoles = [
  "tenant_owner",
  "tenant_admin",
  "billing_admin",
  "communication_manager",
  "content_manager",
  "course_manager",
  "event_manager",
  "community_manager",
  "community_moderator",
  "analyst",
  "support_staff",
  "support_manager",
  "contributor",
  "viewer"
];

const administratorRoles = ["tenant_owner", "tenant_admin"];

async function getTenantContext(roles: string[]) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const requestHeaders = await headers();
  const tenantSlug = requestHeaders.get("x-upnexx-tenant-slug");
  let scopedTenantId: string | null = null;
  if (tenantSlug) {
    const { data: scopedTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (!scopedTenant) return null;
    scopedTenantId = scopedTenant.id;
  }

  const platformAccess =
    roles === managerRoles || roles === administratorRoles
      ? await getPlatformAccess()
      : null;
  if (platformAccess?.permissions.has("platform.tenants.manage")) {
    const tenantId = scopedTenantId ?? (await cookies()).get("upnexx-platform-tenant")?.value;
    if (tenantId) {
      const admin = createAdminClient();
      const { data: tenant } = await admin.from("tenants").select("id,name,slug,status").eq("id", tenantId).maybeSingle();
      if (tenant?.status === "active") {
        return {
          supabase: admin,
          user,
          tenant,
          role: "tenant_admin",
          platformRole: platformAccess.role
        };
      }
    }
  }

  let membershipQuery = supabase
    .from("tenant_memberships")
    .select("tenant_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", roles);
  if (scopedTenantId) membershipQuery = membershipQuery.eq("tenant_id", scopedTenantId);
  const { data: memberships, error } = await membershipQuery.limit(1);

  if (error || !memberships?.[0]) return null;

  const membership = memberships[0];
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id,name,slug,status")
    .eq("id", membership.tenant_id)
    .single();

  if (!tenant) return null;
  if (tenant.status === "pending" && membership.role === "tenant_owner" && (user.email_confirmed_at || user.last_sign_in_at)) {
    const activatedAt = user.email_confirmed_at || user.last_sign_in_at;
    const { error: activationError } = await createAdminClient().from("tenants").update({
      status: "active",
      owner_activated_at: activatedAt,
      updated_at: new Date().toISOString()
    }).eq("id", tenant.id).eq("status", "pending");
    if (activationError) return null;
    tenant.status = "active";
  }
  if (tenant.status !== "active") return null;
  return { supabase, user, tenant, role: membership.role as string };
}

export async function getActiveTenantManager() {
  return getTenantContext(managerRoles);
}

export async function getActiveTenantAdministrator() {
  return getTenantContext(administratorRoles);
}

export async function getActiveTenantWithPermission(permission: TenantPermission) {
  const context = await getActiveTenantManager();
  if (!context) return null;
  const permissions = await getTenantPermissionSet(context.role);
  return permissions.has(permission) ? context : null;
}

export async function getTenantPermissionSet(role: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_role_permissions")
    .select("permission_key")
    .eq("role_key", role);
  if (!error) {
    return new Set(
      (data ?? [])
        .map((row) => row.permission_key)
        .filter((permission): permission is TenantPermission =>
          tenantPermissionKeys.includes(permission as TenantPermission)
        )
    );
  }
  return new Set(
    tenantPermissionKeys.filter((permission) =>
      tenantRoleHasPermission(role, permission)
    )
  );
}

export async function getActiveTenantCommunicator() {
  return getActiveTenantWithPermission("tenant.communications.manage");
}
