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
    .select("id,name,description,status")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getPublicMembershipPlans(slug: string) {
  const tenantId = await getTenantId(slug);
  if (!tenantId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_membership_plans")
    .select("id,name,description,plan_type,price_monthly,currency,community_access,ai_access")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .eq("visibility", "public")
    .order("sort_order", { ascending: true });
  return data ?? [];
}
