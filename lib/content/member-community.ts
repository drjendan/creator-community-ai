import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getTenantId(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  return data?.id as string | undefined;
}

export async function getAccessibleCommunitySpaces(slug: string) {
  const tenantId = await getTenantId(slug);
  if (!tenantId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_spaces")
    .select("id,name,slug,description,status,featured,sort_order")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getPublicMembershipPlans(slug: string) {
  const tenantId = await getTenantId(slug);
  if (!tenantId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_membership_plans")
    .select("id,name,description,plan_type,price_monthly,price_annual,currency,community_access,ai_access,stripe_monthly_price_id,stripe_annual_price_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .eq("visibility", "public")
    .order("sort_order", { ascending: true });
  return data ?? [];
}
