import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { tenantRequestMatchesCurrentWorkspace, type AIConfigurationContext } from "@/lib/ai/permissions";

export async function authorizeAIConfiguration(input: {
  context: AIConfigurationContext;
  requestedTenantId?: string;
  write?: boolean;
}) {
  if (input.context === "tenant") {
    const current = await getActiveTenantAdministrator();
    if (!current) return null;
    if (!tenantRequestMatchesCurrentWorkspace(current.tenant.id, input.requestedTenantId)) return null;
    const admin = createAdminClient();
    const { data: policy } = await admin
      .from("feature_flags")
      .select("enabled")
      .eq("tenant_id", current.tenant.id)
      .eq("key", "tenant_can_manage_ai_credentials")
      .maybeSingle();
    const canWrite = policy?.enabled !== false;
    if (input.write && !canWrite) return null;
    return {
      tenantId: current.tenant.id,
      tenantName: current.tenant.name,
      user: current.user,
      actingRole: current.role,
      context: input.context,
      canWrite
    };
  }

  if (!input.requestedTenantId) return null;
  const access = await getPlatformAdministrator("platform.integrations.manage");
  if (!access) return null;
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,name").eq("id", input.requestedTenantId).maybeSingle();
  if (!tenant) return null;
  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    user: access.user,
    actingRole: access.role,
    context: input.context,
    canWrite: true
  };
}
