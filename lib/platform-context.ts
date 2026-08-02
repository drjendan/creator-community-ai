import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isPlatformRole,
  platformPermissionKeys,
  platformRoleHasPermission,
  type PlatformPermission,
  type PlatformRole
} from "@/lib/permissions";

export type PlatformAccess = {
  user: User;
  role: PlatformRole;
  permissions: Set<PlatformPermission>;
  membershipId: string | null;
  source: "membership" | "environment" | "legacy_claim";
};

function superadminEmails() {
  return new Set(
    (process.env.PLATFORM_SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function getPlatformAccess(): Promise<PlatformAccess | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (user.email && superadminEmails().has(user.email.toLowerCase())) {
    return {
      user,
      role: "platform_owner",
      permissions: new Set(platformPermissionKeys),
      membershipId: null,
      source: "environment"
    };
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("platform_memberships")
    .select("id,role_key,status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membership) {
    if (membership.status !== "active" || !isPlatformRole(membership.role_key)) return null;
    const { data: permissionRows } = await admin
      .from("platform_role_permissions")
      .select("permission_key")
      .eq("role_key", membership.role_key);
    const permissions = new Set(
      (permissionRows ?? [])
        .map((row) => row.permission_key)
        .filter((permission): permission is PlatformPermission =>
          platformPermissionKeys.includes(permission as PlatformPermission)
        )
    );
    return {
      user,
      role: membership.role_key,
      permissions,
      membershipId: membership.id,
      source: "membership"
    };
  }

  const legacyRole = user.app_metadata?.platform_role;
  if (!isPlatformRole(legacyRole) || !["platform_owner", "platform_admin"].includes(legacyRole)) return null;
  return {
    user,
    role: legacyRole,
    permissions: new Set(
      platformPermissionKeys.filter((permission) =>
        platformRoleHasPermission(legacyRole, permission)
      )
    ),
    membershipId: null,
    source: "legacy_claim"
  };
}

export async function getPlatformAdministrator(
  requiredPermission: PlatformPermission = "platform.tenants.view"
) {
  const access = await getPlatformAccess();
  return access?.permissions.has(requiredPermission) ? access : null;
}

export function hasRecentAuthentication(user: User, minutes = 30) {
  if (!user.last_sign_in_at) return false;
  return Date.now() - new Date(user.last_sign_in_at).getTime() <= minutes * 60 * 1000;
}
