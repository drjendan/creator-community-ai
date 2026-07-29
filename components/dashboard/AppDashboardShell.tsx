"use client";

import Link from "next/link";
import { Building2, ChevronDown, ChevronRight, CircleHelp, LogOut, Plus, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/auth/actions";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";

export type DashboardNavItem = { label: string; href: string };

type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

function groupNavigation(nav: DashboardNavItem[]): DashboardNavGroup[] {
  const platform = nav.some((item) => item.href.startsWith("/platform-admin"));
  const definitions = platform
    ? [
        ["Overview", ["Overview"]],
        ["Tenant management", ["Tenants", "Domains"]],
        ["Billing & usage", ["Subscriptions", "Plans", "Usage"]],
        ["Operations", ["Support", "Audit Logs", "Feature Flags", "Platform Settings"]]
      ]
    : [
        ["Overview", ["Overview"]],
        ["Content", ["Podcast", "Courses", "Resources", "Events"]],
        ["Audience", ["Community", "Memberships", "Members"]],
        ["AI & insights", ["AI Studio", "AI Coach", "Analytics"]],
        ["Communication Hub", ["Communication Hub", "Announcements", "Messages", "Email Campaigns", "Templates", "Audience Segments", "Scheduled", "Automations", "Reports", "Email Provider"]],
        ["Workspace", ["Branding", "Team", "AI Providers", "Payments", "Settings"]]
      ];

  return definitions.map(([label, itemLabels]) => ({
    label: label as string,
    items: nav.filter((item) => (itemLabels as string[]).includes(item.label))
  }));
}

export function TenantSwitcher({
  tenantName,
  platformAdminHref
}: {
  tenantName: string;
  platformAdminHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-tour="tenant-switcher">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-brand-200 bg-white px-3 py-2 text-left text-sm font-bold text-brand-800"
        aria-label="Switch tenant"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{tenantName}</span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-brand-200 bg-white p-2 text-brand-900 shadow-card">
          <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold">
            <Building2 className="h-4 w-4 text-accent-700" />
            <span className="truncate">{tenantName}</span>
          </div>
          {platformAdminHref && (
            <Link
              href={platformAdminHref}
              role="menuitem"
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-accent-700 transition hover:bg-accent-50"
            >
              <Plus className="h-4 w-4" />
              Create new tenant
            </Link>
          )}
          {!platformAdminHref && (
            <p className="px-3 py-2 text-xs text-brand-500">Only platform administrators can create additional tenants.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function UserMenu({ label = "Account" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-bold text-brand-800"
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-100 text-xs text-accent-800">{label.slice(0, 1)}</span>
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-brand-200 bg-white p-2 shadow-card"
        >
          <div className="flex items-center gap-3 border-b border-brand-100 px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-accent-800"><UserRound className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-sm font-bold text-brand-900">{label}</p><p className="text-xs text-brand-500">Signed in</p></div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-700 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AppDashboardShell({ children, title, subtitle, nav, userLabel, platformAdminHref, tourIdentity, brand }: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  nav: DashboardNavItem[];
  userLabel?: string;
  platformAdminHref?: string;
  tourIdentity?: string;
  brand?: { name?: string; tagline?: string; logoUrl?: string | null; primaryColor?: string };
}) {
  const pathname = usePathname();
  const groups = groupNavigation(nav);
  const activeGroup = groups.find((group) =>
    group.items.some((item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && item.href !== "/platform-admin" && pathname.startsWith(`${item.href}/`))
    )
  )?.label;
  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroup && activeGroup !== "Overview" ? [activeGroup] : []));
  const [tourSignal, setTourSignal] = useState(0);
  const tourScope = nav.some((item) => item.href.startsWith("/platform-admin")) ? "platform" : "tenant";

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function navLink(item: DashboardNavItem, nested = false) {
    const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/platform-admin" && pathname.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "block rounded-lg py-2 text-sm font-semibold transition",
          nested ? "px-9" : "px-3",
          active ? "bg-accent-600 text-white" : "text-brand-200 hover:bg-white/10 hover:text-white"
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-brand-200 bg-brand-900 p-5 text-white lg:block" style={brand?.primaryColor ? { backgroundColor: brand.primaryColor } : undefined} data-tour="main-navigation">
          <BrandMark inverse name={brand?.name} tagline={brand?.tagline} logoUrl={brand?.logoUrl} />
          <div className="mt-8"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-brand-300">{subtitle}</p><TenantSwitcher tenantName={title} platformAdminHref={platformAdminHref} /></div>
          <nav className="mt-7 space-y-1" aria-label={`${title} dashboard navigation`}>
            {groups.map((group) => {
              if (group.label === "Overview") return group.items.map((item) => navLink(item));
              const open = openGroups.has(group.label) || group.label === activeGroup;
              const containsActive = group.label === activeGroup;
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition",
                      containsActive ? "text-white" : "text-brand-200 hover:bg-white/10 hover:text-white"
                    )}
                    aria-expanded={open}
                  >
                    <span>{group.label}</span>
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {open && <div className="mt-1 space-y-1">{group.items.map((item) => navLink(item, true))}</div>}
                </div>
              );
            })}
          </nav>
          {platformAdminHref && (
            <Link href={platformAdminHref} className="mt-6 block rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-brand-100 transition hover:bg-white/10">
              Platform administration
            </Link>
          )}
          <p className="mt-6 border-t border-white/10 pt-5 text-[10px] font-semibold text-brand-300">Powered by Nexx Jenn Technologies</p>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-brand-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1"><p className="truncate font-display font-bold text-brand-900">{title}</p><p className="hidden text-xs text-brand-500 sm:block">{subtitle}</p></div>
              <div className="flex items-center gap-2" data-tour="account-controls">
                <button type="button" onClick={() => setTourSignal((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50" aria-label="Take a tour"><CircleHelp className="h-5 w-5" /><span className="hidden xl:inline">Tour</span></button>
                <UserMenu label={userLabel} />
              </div>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Mobile dashboard navigation">{nav.map((item) => <Link key={item.href} href={item.href} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold", pathname === item.href ? "bg-accent-600 text-white" : "bg-brand-100 text-brand-700")}>{item.label}</Link>)}</nav>
          </header>
          <main className="p-4 md:p-8" data-tour="workspace">{children}</main>
        </div>
      </div>
      <OnboardingTour scope={tourScope} startSignal={tourSignal} identity={tourIdentity} />
    </div>
  );
}
