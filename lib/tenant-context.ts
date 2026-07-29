import "server-only";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const managerRoles = [
  "tenant_owner",
  "tenant_admin",
  "communication_manager",
  "content_manager",
  "course_manager",
  "event_manager",
  "community_manager",
  "community_moderator",
  "analyst",
  "support_staff"
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

export async function getActiveTenantCommunicator() {
  const context = await getActiveTenantManager();
  if (!context || !["tenant_owner", "tenant_admin", "communication_manager"].includes(context.role)) return null;
  return context;
}
