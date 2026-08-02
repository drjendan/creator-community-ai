"use client";

import Link from "next/link";
import { Building2, ChevronDown, CircleHelp, LockKeyhole, LogOut, Plus, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/auth/actions";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { TrialExperience, type TrialExperienceState } from "@/components/dashboard/TrialExperience";
import type { NavigationItem } from "@/lib/navigation";
import { AppFooter } from "@/components/layout/AppFooter";
import { poweredByText } from "@/lib/terminology";

export type DashboardNavItem = NavigationItem & {
  locked?: boolean;
  lockedReason?: string;
};

type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
  standalone: boolean;
};

function groupNavigation(nav: DashboardNavItem[]): DashboardNavGroup[] {
  return nav.reduce<DashboardNavGroup[]>((groups, item) => {
    if (!item.group) {
      groups.push({ label: item.label, items: [item], standalone: true });
      return groups;
    }
    const existing = groups.find((group) => !group.standalone && group.label === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ label: item.group, items: [item], standalone: false });
    return groups;
  }, []);
}

function navigationPath(href: string) {
  return href.split(/[?#]/, 1)[0];
}

export function TenantSwitcher({
  tenantName,
  platformAdminHref
}: {
  tenantName: string;
  platformAdminHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null); const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false); }
    function keyboard(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } }
    document.addEventListener("mousedown", close); document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", keyboard); };
  }, []);

  return (
    <div className="relative" data-tour="tenant-switcher" ref={containerRef}>
      <button
        ref={buttonRef}
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
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
        ref={triggerRef}
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

export function AppDashboardShell({ children, title, subtitle, nav, userLabel, platformAdminHref, tourIdentity, brand, trial }: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  nav: DashboardNavItem[];
  userLabel?: string;
  platformAdminHref?: string;
  tourIdentity?: string;
  brand?: { name?: string; tagline?: string; logoUrl?: string | null; primaryColor?: string };
  trial?: TrialExperienceState;
}) {
  const pathname = usePathname();
  const groups = groupNavigation(nav);
  const activeGroup = groups.find((group) =>
    group.items.some((item) =>
      pathname === navigationPath(item.href) ||
      (!["/dashboard", "/platform-admin"].includes(navigationPath(item.href)) && pathname.startsWith(`${navigationPath(item.href)}/`))
    )
  );
  const [openGroups, setOpenGroups] = useState(() => new Set(activeGroup && !activeGroup.standalone ? [activeGroup.label] : []));
  const [tourSignal, setTourSignal] = useState(0);
  const [lockedMessage, setLockedMessage] = useState("");
  const tourScope = nav.some((item) => item.href.startsWith("/platform-admin")) ? "platform" : "tenant";

  useEffect(() => {
    const stored = window.localStorage.getItem(`upnexx:navigation:${tourScope}`);
    if (!stored) return;
    try {
      const labels = JSON.parse(stored) as string[];
      setOpenGroups((current) => new Set([...current, ...labels]));
    } catch {
      window.localStorage.removeItem(`upnexx:navigation:${tourScope}`);
    }
  }, [tourScope]);

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      window.localStorage.setItem(`upnexx:navigation:${tourScope}`, JSON.stringify([...next]));
      return next;
    });
  }

  function navLink(item: DashboardNavItem, nested = false, mobile = false) {
    const path = navigationPath(item.href);
    const active = pathname === path || (!["/dashboard", "/platform-admin"].includes(path) && pathname.startsWith(`${path}/`));
    return (
      <Link
        key={item.href}
        href={item.locked ? "#" : item.href}
        aria-label={mobile ? `Mobile ${item.label}` : undefined}
        aria-current={active ? "page" : undefined}
        aria-disabled={item.locked || undefined}
        onClick={item.locked ? (event) => {
          event.preventDefault();
          setLockedMessage(item.lockedReason ?? `${item.label} is not included in this tenant's current plan.`);
        } : undefined}
        title={item.locked ? item.lockedReason : undefined}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg py-2 text-sm font-semibold transition",
          nested ? "px-9" : "px-3",
          active ? "bg-accent-600 text-white" : item.locked ? "cursor-not-allowed text-brand-400" : "text-brand-200 hover:bg-white/10 hover:text-white"
        )}
      >
        <span>{item.label}</span>
        {item.locked && <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-label="Plan restricted" />}
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
              if (group.standalone) return group.items.map((item) => navLink(item));
              const open = openGroups.has(group.label) || group.label === activeGroup?.label;
              const containsActive = group.label === activeGroup?.label;
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
                    <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
                  </button>
                  <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden"><div className="mt-1 space-y-1">{group.items.map((item) => navLink(item, true))}</div></div>
                  </div>
                </div>
              );
            })}
          </nav>
          {platformAdminHref && (
            <Link href={platformAdminHref} className="mt-6 block rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-brand-100 transition hover:bg-white/10">
              Platform administration
            </Link>
          )}
          <p className="mt-6 border-t border-white/10 pt-5 text-[10px] font-semibold text-brand-300">{poweredByText}</p>
        </aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="relative sticky top-0 z-20 border-b border-brand-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display font-bold text-brand-900">{title}</p>
                  {trial && <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">{trial.subscriptionType}</span>}
                </div>
                <p className="hidden text-xs text-brand-500 sm:block">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2" data-tour="account-controls">
                <button type="button" onClick={() => setTourSignal((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50" aria-label="Take a tour"><CircleHelp className="h-5 w-5" /><span className="hidden xl:inline">Tour</span></button>
                <UserMenu label={userLabel} />
              </div>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Mobile dashboard navigation">
              {groups.map((group) => {
                if (group.standalone) return group.items.map((item) => navLink(item));
                const open = openGroups.has(group.label) || group.label === activeGroup?.label;
                return (
                  <div key={group.label} className="shrink-0">
                    <button type="button" onClick={() => toggleGroup(group.label)} aria-label={`Mobile ${group.label}`} aria-expanded={open} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold", group.label === activeGroup?.label ? "bg-brand-900 text-white" : "bg-brand-100 text-brand-700")}>
                      {group.label}<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} />
                    </button>
                    {open && <div className="absolute left-4 right-4 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-brand-200 bg-brand-900 p-2 shadow-card">{group.items.map((item) => navLink(item, true, true))}</div>}
                  </div>
                );
              })}
            </nav>
            {lockedMessage && <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs font-semibold text-brand-800"><span>{lockedMessage} Contact your UpNexx administrator to change the plan.</span><button type="button" onClick={() => setLockedMessage("")} className="shrink-0 font-bold text-brand-900" aria-label="Dismiss plan message">Dismiss</button></div>}
          </header>
          {trial && <TrialExperience trial={trial} />}
          <main className="flex-1 p-4 md:p-8" data-tour="workspace">{children}</main>
          <AppFooter />
        </div>
      </div>
      <OnboardingTour scope={tourScope} startSignal={tourSignal} identity={tourIdentity} />
    </div>
  );
}
