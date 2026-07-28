import type { CSSProperties } from "react";
import type { Tenant } from "@/lib/tenant-types";

export function TenantBranding({ tenant, children }: { tenant: Tenant; children: React.ReactNode }) {
  const style = {
    "--tenant-primary": tenant.primaryColor,
    "--tenant-accent": tenant.accentColor
  } as CSSProperties;
  return <div style={style} data-tenant-id={tenant.id} data-tenant-slug={tenant.slug}>{children}</div>;
}
