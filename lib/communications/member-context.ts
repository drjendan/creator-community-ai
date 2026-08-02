import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getTenantMemberContext(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,name,slug").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!tenant) return null;
  const { data: membership } = await supabase.from("tenant_memberships").select("id,role,status,created_at").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("status", "active").maybeSingle();
  if (!membership) return null;
  const [{ data: profile }, { data: branding }, { data: subscription }] = await Promise.all([
    supabase.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("tenant_branding").select("*").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("member_subscriptions").select("status,starts_at,renewal_at,plan_id,stripe_customer_id,tenant_membership_plans(name,benefits)").eq("tenant_id", tenant.id).eq("user_id", user.id).maybeSingle()
  ]);
  return { supabase, user, tenant, membership, profile, branding, subscription };
}
