import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { getTenantTrialAccess, standardTrialFeatureKeys } from "@/lib/trials";

export const defaultTenantFeatures = ["podcasts", "courses", "resources", "events"] as const;

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
  const entitlements = new Map((data ?? []).map((item: { feature_key: string; enabled: boolean }) => [item.feature_key, item.enabled]));
  // Tenants created before feature entitlements existed retain the core content
  // product. Explicit false rows still win and remain visibly plan-restricted.
  for (const key of defaultTenantFeatures) {
    if (!entitlements.has(key)) entitlements.set(key, true);
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const trial = await getTenantTrialAccess(tenantId);
    if (trial.isActiveTrial) {
      for (const key of standardTrialFeatureKeys) entitlements.set(key, true);
    }
  }
  return entitlements;
}

export async function requireTenantFeature(featureKey: string) {
  const context = await getActiveTenantManager();
  if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get(featureKey) !== true) return null;
  return context;
}
