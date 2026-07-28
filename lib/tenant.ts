import { tenants, type Tenant } from "@/lib/mock/podcastos";

export type TenantSource = "path" | "subdomain" | "custom-domain";

export interface TenantResolution {
  slug: string;
  source: TenantSource;
}

export function normalizeHost(host: string) {
  return host.trim().toLowerCase().split(":")[0];
}

export function resolveTenantIdentifier(input: {
  pathname?: string;
  host?: string;
  rootDomain?: string;
}): TenantResolution | null {
  const pathMatch = input.pathname?.match(/^\/demo\/([a-z0-9-]+)(?:\/|$)/i);
  if (pathMatch) return { slug: pathMatch[1].toLowerCase(), source: "path" };

  if (!input.host) return null;
  const host = normalizeHost(input.host);
  const root = normalizeHost(input.rootDomain ?? "upnexx.com");
  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1)).split(".").at(-1);
    return slug && slug !== "www" ? { slug, source: "subdomain" } : null;
  }
  return { slug: host, source: "custom-domain" };
}

export function getTenantBySlug(slug: string): Tenant | null {
  return tenants.find((tenant) => tenant.slug === slug.toLowerCase()) ?? null;
}

