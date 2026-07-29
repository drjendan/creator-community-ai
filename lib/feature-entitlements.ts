import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveTenantManager } from "@/lib/tenant-context";

export const communicationFeatureKeys = [
  "communication_hub",
  "communication_announcements",
  "communication_direct_messages",
  "communication_email_campaigns",
  "communication_templates",
  "communication_segments",
  "communication_scheduling",
  "communication_reports",
  "communication_byop_email"
] as const;

export async function getTenantEntitlements(tenantId: string, supabase?: SupabaseClient) {
  let client = supabase;
  if (!client) {
    const context = await getActiveTenantManager();
    if (!context || context.tenant.id !== tenantId) return new Map<string, boolean>();
    client = context.supabase;
  }
  const { data } = await client.from("tenant_feature_entitlements").select("feature_key,enabled").eq("tenant_id", tenantId);
  return new Map((data ?? []).map((item: { feature_key: string; enabled: boolean }) => [item.feature_key, item.enabled]));
}

export async function requireTenantFeature(featureKey: string) {
  const context = await getActiveTenantManager();
  if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get(featureKey) !== true) return null;
  return context;
}
