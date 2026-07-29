import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { BrandingManager } from "@/components/dashboard/BrandingManager";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformTenantBrandingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getPlatformAdministrator())) notFound();
  const { id } = await params;
  const { data: tenant } = await createAdminClient()
    .from("tenants")
    .select("id,name")
    .eq("id", id)
    .maybeSingle();
  if (!tenant) notFound();
  return (
    <div className="space-y-6">
      <Button href={`/platform-admin/tenants/${id}`} variant="secondary">
        <ArrowLeft className="h-4 w-4" />
        Back to {tenant.name}
      </Button>
      <BrandingManager
        endpoint={`/api/platform/tenants/${id}/branding`}
        uploadEndpoint="/api/platform-assets"
        tenantId={id}
      />
    </div>
  );
}
