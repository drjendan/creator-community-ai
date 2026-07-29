import "server-only";

import { createClient } from "@/lib/supabase/server";

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

export async function getActiveTenantAdministrator() {
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
    .in("role", administratorRoles)
    .limit(1);
  if (error || !memberships?.[0]) return null;
  const membership = memberships[0];
  const { data: tenant } = await supabase.from("tenants").select("id,name,slug").eq("id", membership.tenant_id).single();
  if (!tenant) return null;
  return { supabase, user, tenant, role: membership.role as string };
}

export async function getActiveTenantCommunicator() {
  const context = await getActiveTenantManager();
  if (!context || !["tenant_owner", "tenant_admin", "communication_manager"].includes(context.role)) return null;
  return context;
}
