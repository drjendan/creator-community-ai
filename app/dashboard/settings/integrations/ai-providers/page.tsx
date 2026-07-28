import { KeyRound } from "lucide-react";
import { AiProviderSettings } from "@/components/dashboard/AiProviderSettings";
import { EmptyState } from "@/components/feedback/EmptyState";
import { hasSupabaseEnv } from "@/lib/env";
import { hasValidEncryptionConfiguration } from "@/lib/security/api-key-encryption";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";

export default async function TenantAiProvidersPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const context = hasSupabaseEnv() ? await getActiveTenantAdministrator() : null;
  if (!context) {
    return (
      <EmptyState
        title="Tenant administrator access is required"
        description="Only an owner or administrator of the current organization can manage its AI provider credentials."
        icon={KeyRound}
      />
    );
  }

  const live = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && hasValidEncryptionConfiguration());
  return <AiProviderSettings tenantName={context.tenant.name} live={live} context="tenant" returnTo={returnTo === "ai-quick-start" ? "/dashboard#ai-quick-start" : undefined} />;
}
