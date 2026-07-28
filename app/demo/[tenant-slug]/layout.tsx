import { notFound } from "next/navigation";
import { TenantSiteShell } from "@/components/tenant/TenantSiteShell";
import { getTenantSiteBySlug } from "@/lib/tenant-site";

export default async function TenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ "tenant-slug": string }>;
}) {
  const { "tenant-slug": slug } = await params;
  const tenant = await getTenantSiteBySlug(slug);
  if (!tenant) notFound();
  return <TenantSiteShell tenant={tenant}>{children}</TenantSiteShell>;
}
