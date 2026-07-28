import "server-only";

import { createClient } from "@/lib/supabase/server";

const managerRoles = [
  "tenant_owner",
  "tenant_admin",
  "content_manager"
];

export async function getActiveTenantManager() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: memberships, error } = await supabase
    .from("tenant_memberships")
    .select("tenant_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", managerRoles)
    .limit(1);

  if (error || !memberships?.[0]) return null;

  const membership = memberships[0];
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id,name,slug")
    .eq("id", membership.tenant_id)
    .single();

  if (!tenant) return null;
  return { supabase, user, tenant, role: membership.role as string };
}

