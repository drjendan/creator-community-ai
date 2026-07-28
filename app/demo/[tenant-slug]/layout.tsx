import { TenantSiteShell } from "@/components/tenant/TenantSiteShell";
import { getTenantBySlug } from "@/lib/tenant";
import Link from "next/link";

export default async function DemoTenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ "tenant-slug": string }>;
}) {
  const { "tenant-slug": slug } = await params;
  const tenant = getTenantBySlug(slug);
  if (!tenant) {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-50 px-6 text-center">
        <div><p className="text-sm font-bold uppercase tracking-wide text-accent-700">Tenant not found</p><h1 className="mt-3 font-display text-4xl font-extrabold text-brand-900">This UpNexx community does not exist.</h1><p className="mt-4 text-brand-600">Check the tenant address or return to the UpNexx homepage.</p><Link href="/" className="mt-7 inline-flex rounded-lg bg-accent-600 px-5 py-3 font-bold text-white">Return home</Link></div>
      </main>
    );
  }
  return <TenantSiteShell tenant={tenant}>{children}</TenantSiteShell>;
}

