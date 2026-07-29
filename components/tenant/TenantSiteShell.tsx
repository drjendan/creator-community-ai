import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Button, Container } from "@/components/ui";
import type { Tenant } from "@/lib/tenant-types";
import { TenantBranding } from "@/components/tenant/TenantBranding";

export function TenantSiteShell({ tenant, children }: { tenant: Tenant; children: React.ReactNode }) {
  const base = `/demo/${tenant.slug}`;
  // Supabase brand assets are tenant-controlled public presentation files.
  // eslint-disable-next-line @next/next/no-img-element
  const tenantLogo = tenant.logoUrl ? <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-12 max-w-48 object-contain" /> : null;
  const enabled = new Set(tenant.enabledFeatures ?? []);
  const nav = [
    ...(enabled.has("podcasts") ? [["Episodes", `${base}/episodes`]] : []),
    ...(enabled.has("community") ? [["Community", `${base}/community`]] : []),
    ...(enabled.has("courses") ? [["Courses", `${base}/courses`]] : []),
    ...(enabled.has("events") ? [["Events", `${base}/events`]] : []),
    ...(enabled.has("memberships") ? [["Membership", `${base}/membership`]] : []),
    ...(tenant.communicationEnabled ? [["Welcome", `${base}/welcome`], ["Messages", `${base}/messages`], ["Preferences", `${base}/settings/communications`]] : [])
  ];
  return (
    <TenantBranding tenant={tenant}>
    <div className="min-h-screen bg-brand-50">
      <div className="bg-brand-900 py-2 text-center text-xs font-semibold text-brand-100">Powered by UpNexx · Nexx Jenn Technologies</div>
      <header className="border-b border-brand-200 bg-white">
        <Container className="flex h-20 items-center justify-between gap-6">
          <Link href={base} className="flex items-center gap-3 font-display text-xl font-extrabold text-brand-900">{tenantLogo ?? <>{tenant.name}<span className="text-accent-600">.</span></>}</Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label={`${tenant.name} navigation`}>
            {nav.map(([label, href]) => <Link key={href} href={href} className="text-sm font-semibold text-brand-700 hover:text-accent-700">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Button href={tenant.communicationEnabled ? `${base}/welcome` : base} size="sm">Member Home</Button>
          </div>
        </Container>
      </header>
      {children}
      <footer className="border-t border-brand-200 bg-white py-10">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div><p className="font-display text-xl font-extrabold text-brand-900">{tenant.name}</p><p className="mt-1 text-sm text-brand-500">{tenant.tagline}</p></div>
          <BrandMark compact />
        </Container>
      </footer>
    </div>
    </TenantBranding>
  );
}

