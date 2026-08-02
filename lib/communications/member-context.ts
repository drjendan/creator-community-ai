import "server-only";

import { getPlatformAccess } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getTenantMemberContext(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,name,slug").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!tenant) return null;
  const { data: tenantMembership } = await supabase.from("tenant_memberships").select("id,role,status,created_at").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("status", "active").maybeSingle();
  let membership = tenantMembership;
  let memberClient = supabase;
  if (!membership) {
    const platformAccess = await getPlatformAccess();
    if (!platformAccess?.permissions.has("platform.tenants.manage")) return null;
    membership = {
      id: `platform-member-view:${user.id}:${tenant.id}`,
      role: "tenant_admin",
      status: "active",
      created_at: new Date(0).toISOString()
    };
    memberClient = admin;
  }
  const [{ data: profile }, { data: branding }, { data: subscription }] = await Promise.all([
    memberClient.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle(),
    memberClient.from("tenant_branding").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    memberClient.from("member_subscriptions").select("status,starts_at,renewal_at,plan_id,stripe_customer_id,tenant_membership_plans(name,benefits)").eq("tenant_id", tenant.id).eq("user_id", user.id).maybeSingle()
  ]);
  return { supabase: memberClient, user, tenant, membership, profile, branding, subscription };
}
