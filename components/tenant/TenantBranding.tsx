import type { CSSProperties } from "react";
import type { Tenant } from "@/lib/tenant-types";

export function TenantBranding({ tenant, children }: { tenant: Tenant; children: React.ReactNode }) {
  const style = {
    "--tenant-primary": tenant.primaryColor,
    "--tenant-secondary": tenant.secondaryColor,
    "--tenant-accent": tenant.accentColor,
    "--tenant-background": tenant.backgroundColor,
    "--tenant-text": tenant.textColor,
    "--tenant-button": tenant.buttonColor,
    "--tenant-link": tenant.linkColor
  } as CSSProperties;
  return <div style={style} data-tenant-id={tenant.id} data-tenant-slug={tenant.slug}>{children}</div>;
}
