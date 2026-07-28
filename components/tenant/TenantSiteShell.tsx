import Link from "next/link";
import { Bot, Menu, Search } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button, Container } from "@/components/ui";
import type { Tenant } from "@/lib/tenant-types";
import { TenantBranding } from "@/components/tenant/TenantBranding";

export function TenantSiteShell({ tenant, children }: { tenant: Tenant; children: React.ReactNode }) {
  const base = `/demo/${tenant.slug}`;
  const nav = [
    ["Episodes", `${base}/episodes`], ["Community", `${base}/community`],
    ["Courses", `${base}/courses`], ["Events", `${base}/events`], ["Membership", `${base}/membership`]
  ];
  return (
    <TenantBranding tenant={tenant}>
    <div className="min-h-screen bg-brand-50">
      <div className="bg-brand-900 py-2 text-center text-xs font-semibold text-brand-100">Powered by UpNexx · Nexx Jenn Technologies</div>
      <header className="border-b border-brand-200 bg-white">
        <Container className="flex h-20 items-center justify-between gap-6">
          <Link href={base} className="font-display text-xl font-extrabold text-brand-900">{tenant.name}<span className="text-accent-600">.</span></Link>
          <nav className="hidden items-center gap-6 lg:flex" aria-label={`${tenant.name} navigation`}>
            {nav.map(([label, href]) => <Link key={href} href={href} className="text-sm font-semibold text-brand-700 hover:text-accent-700">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <button aria-label="Search" className="hidden rounded-lg p-2 text-brand-600 sm:block"><Search className="h-5 w-5" /></button>
            <Button href={`${base}/member`} size="sm">Member Dashboard</Button>
            <button aria-label="Open tenant navigation" className="rounded-lg border border-brand-200 p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
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
      <Link href={`${base}/member#ai-coach`} aria-label="Open AI Coach" className="fixed bottom-5 right-5 grid h-14 w-14 place-items-center rounded-full bg-accent-600 text-white shadow-lift"><Bot /></Link>
    </div>
    </TenantBranding>
  );
}

