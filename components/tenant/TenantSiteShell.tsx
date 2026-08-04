import type { Tenant } from "@/lib/tenant-types";
import { TenantBranding } from "@/components/tenant/TenantBranding";
import { MemberHeader } from "@/components/tenant/MemberHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { poweredByText } from "@/lib/terminology";
import { memberNavigation } from "@/lib/member-navigation";
import { getMemberHeaderState } from "@/lib/member-experience";
import { headers } from "next/headers";

export async function TenantSiteShell({ tenant, children }: { tenant: Tenant; children: React.ReactNode }) {
  const requestHeaders = await headers();
  const base = requestHeaders.get("x-upnexx-tenant-slug") === tenant.slug ? "" : `/demo/${tenant.slug}`;
  const { access, notifications } = await getMemberHeaderState(tenant.id, tenant.slug);
  return (
    <TenantBranding tenant={tenant}>
      <div className="min-h-screen bg-brand-50">
        <div className="bg-brand-900 py-2 text-center text-xs font-semibold text-brand-100">UpNexx · {poweredByText}</div>
        <MemberHeader
          tenantId={tenant.id}
          tenantName={tenant.name}
          tenantLogo={tenant.logoUrl}
          base={base}
          navigation={memberNavigation(base)}
          access={access ? {
            userLabel: access.userLabel,
            canTenantAdmin: access.canTenantAdmin,
            canPlatformAdmin: access.canPlatformAdmin,
            canManageTenantAsPlatform: access.canManageTenantAsPlatform
          } : null}
          initialNotifications={notifications}
        />
        {children}
        <AppFooter tenantName={tenant.name} tenantTagline={tenant.tagline} tenantSlug={tenant.slug} tenantBase={base} />
      </div>
    </TenantBranding>
  );
}
