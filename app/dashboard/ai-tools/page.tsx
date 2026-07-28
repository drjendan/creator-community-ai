import { AiProviderSettings } from "@/components/dashboard/AiProviderSettings";
import { hasSupabaseEnv } from "@/lib/env";
import { demoTenant } from "@/lib/mock/podcastos";

export default function AiToolsPage() {
  const live = hasSupabaseEnv() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.APP_ENCRYPTION_KEY);

  return (
    <AiProviderSettings
      tenantId={demoTenant.id}
      tenantName={demoTenant.name}
      live={live}
    />
  );
}

