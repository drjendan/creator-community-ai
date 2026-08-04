"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Bell, BriefcaseBusiness, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { enterTenantWorkspace } from "@/app/platform-admin/tenants/actions";
import { cn } from "@/lib/cn";
import type { MemberNotification } from "@/lib/member-experience";
import type { MemberNavigationItem } from "@/lib/member-navigation";

type Access = {
  userLabel: string;
  canTenantAdmin: boolean;
  canPlatformAdmin: boolean;
  canManageTenantAsPlatform: boolean;
} | null;

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) { if (ref.current && !ref.current.contains(event.target as Node)) close(); }
    function keyboard(event: KeyboardEvent) { if (event.key === "Escape") { close(); trigger.current?.focus(); } }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", keyboard); };
  }, [open, close]);
  return { ref, trigger };
}

export function MemberHeader({
  tenantId,
  tenantName,
  tenantLogo,
  base,
  navigation,
  access,
  initialNotifications
}: {
  tenantId: string;
  tenantName: string;
  tenantLogo?: string | null;
  base: string;
  navigation: MemberNavigationItem[];
  access: Access;
  initialNotifications: MemberNotification[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const community = useDismiss(communityOpen, () => setCommunityOpen(false));

  return (
    <header className="border-b border-brand-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link href={`${base}/welcome`} className="flex min-w-0 items-center gap-3 font-display text-xl font-extrabold text-brand-900">
            {tenantLogo && <img src={tenantLogo} alt={`${tenantName} logo`} className="h-12 max-w-40 object-contain" />}
            <span className="truncate">{tenantName}<span className="text-accent-600">.</span></span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label={`${tenantName} member navigation`}>
            {navigation.map((item) => item.children ? (
              <div key={item.label} className="relative" ref={community.ref}>
                <button ref={community.trigger} type="button" onClick={() => setCommunityOpen((value) => !value)} aria-expanded={communityOpen} aria-haspopup="menu" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-accent-700">
                  {item.label}<ChevronDown className={cn("h-4 w-4 transition", communityOpen && "rotate-180")} />
                </button>
                {communityOpen && <div role="menu" className="absolute left-0 top-[calc(100%+12px)] z-40 w-48 rounded-xl border border-brand-200 bg-white p-2 shadow-card">{item.children.map((child) => <Link key={child.href} role="menuitem" href={child.href} onClick={() => setCommunityOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 hover:text-accent-700">{child.label}</Link>)}</div>}
              </div>
            ) : <Link key={item.href} href={item.href!} className="text-sm font-semibold text-brand-700 hover:text-accent-700">{item.label}</Link>)}
          </nav>

          <div className="flex items-center gap-2">
            {access?.canTenantAdmin && <Link href="/dashboard" className="hidden rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-xs font-bold text-accent-800 xl:inline-flex">Return to Tenant Admin</Link>}
            {access && <NotificationMenu tenantSlug={base.split("/").at(-1)!} base={base} initialNotifications={initialNotifications} />}
            {(access?.canTenantAdmin || access?.canPlatformAdmin) && <WorkspaceMenu tenantId={tenantId} base={base} access={access} />}
            {access ? <ProfileMenu base={base} label={access.userLabel} /> : <Link href={`/login?next=${encodeURIComponent(`${base}/welcome`)}`} className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-bold text-brand-800">Sign In</Link>}
            <button type="button" className="rounded-lg border border-brand-200 p-2 text-brand-800 lg:hidden" aria-label="Toggle member navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>

        {mobileOpen && <nav className="border-t border-brand-100 py-4 lg:hidden" aria-label="Mobile member navigation">
          <div className="space-y-1">{navigation.map((item) => item.children ? <div key={item.label}><button type="button" className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold text-brand-800 hover:bg-brand-50" aria-expanded={mobileCommunityOpen} onClick={() => setMobileCommunityOpen((value) => !value)}><span>{item.label}</span><ChevronDown className={cn("h-4 w-4 transition", mobileCommunityOpen && "rotate-180")} /></button>{mobileCommunityOpen && <div className="ml-4 border-l border-brand-200 pl-2">{item.children.map((child) => <Link key={child.href} href={child.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">{child.label}</Link>)}</div>}</div> : <Link key={item.href} href={item.href!} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-brand-800 hover:bg-brand-50">{item.label}</Link>)}</div>
          {access?.canTenantAdmin && <Link href="/dashboard" className="mt-3 block rounded-lg bg-accent-50 px-3 py-2 text-sm font-bold text-accent-800">Return to Tenant Admin</Link>}
        </nav>}
      </div>
    </header>
  );
}

function WorkspaceMenu({ tenantId, base, access }: { tenantId: string; base: string; access: NonNullable<Access> }) {
  const [open, setOpen] = useState(false);
  const menu = useDismiss(open, () => setOpen(false));
  return <div className="relative" ref={menu.ref}><button ref={menu.trigger} type="button" aria-label="Open workspace switcher" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-2 py-2 text-xs font-bold text-brand-800 sm:px-3"><BriefcaseBusiness className="h-4 w-4" /><span className="hidden md:inline">Viewing as Member</span><ChevronDown className="h-4 w-4" /></button>{open && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 rounded-xl border border-brand-200 bg-white p-2 shadow-card"><Link role="menuitem" href={`${base}/welcome`} className="block rounded-lg bg-brand-50 px-3 py-2 text-sm font-bold text-brand-900">Member Home</Link>{access.canTenantAdmin && (access.canManageTenantAsPlatform ? <form action={enterTenantWorkspace}><input type="hidden" name="tenantId" value={tenantId} /><button role="menuitem" type="submit" className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-brand-800 hover:bg-brand-50">Tenant Admin</button></form> : <Link role="menuitem" href="/dashboard" className="mt-1 block rounded-lg px-3 py-2 text-sm font-bold text-brand-800 hover:bg-brand-50">Tenant Admin</Link>)}{access.canPlatformAdmin && <Link role="menuitem" href="/platform-admin" className="mt-1 block rounded-lg px-3 py-2 text-sm font-bold text-brand-800 hover:bg-brand-50">Platform Admin</Link>}</div>}</div>;
}

function ProfileMenu({ base, label }: { base: string; label: string }) {
  const [open, setOpen] = useState(false);
  const menu = useDismiss(open, () => setOpen(false));
  return <div className="relative" ref={menu.ref}><button ref={menu.trigger} type="button" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 p-2 text-brand-800 sm:px-3"><UserRound className="h-5 w-5" /><span className="hidden max-w-28 truncate text-sm font-bold xl:inline">{label}</span><ChevronDown className="hidden h-4 w-4 sm:block" /></button>{open && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-xl border border-brand-200 bg-white p-2 shadow-card"><Link role="menuitem" href={`${base}/account`} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">My Account</Link><Link role="menuitem" href={`${base}/account#membership`} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">Billing or Membership Details</Link><Link role="menuitem" href={`${base}/settings/communications`} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">Preferences</Link><form action={signOut}><button role="menuitem" type="submit" className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign Out</button></form></div>}</div>;
}

function NotificationMenu({ tenantSlug, base, initialNotifications }: { tenantSlug: string; base: string; initialNotifications: MemberNotification[] }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const menu = useDismiss(open, () => setOpen(false));
  const unread = notifications.filter((item) => item.status === "unread").length;
  async function mark(id?: string) {
    const response = await fetch("/api/member/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantSlug, id, all: !id }) });
    if (response.ok) setNotifications((current) => current.map((item) => !id || item.id === id ? { ...item, status: "read" } : item));
  }
  return <div className="relative" ref={menu.ref}><button ref={menu.trigger} type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative rounded-lg border border-brand-200 p-2 text-brand-800"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}</button>{open && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-brand-200 bg-white p-3 shadow-card"><div className="flex items-center justify-between gap-3"><p className="font-display font-bold text-brand-900">Notifications</p>{unread > 0 && <button type="button" onClick={() => void mark()} className="text-xs font-bold text-accent-700">Mark all as read</button>}</div><div className="mt-2 max-h-72 overflow-y-auto">{notifications.length ? notifications.map((item) => <div key={item.id} className={cn("border-t border-brand-100 py-3", item.status === "unread" && "bg-accent-50/50")}><p className="text-sm font-bold text-brand-900">{item.title}</p>{item.body && <p className="mt-1 text-xs text-brand-600">{item.body}</p>}<div className="mt-2 flex items-center justify-between gap-2"><time className="text-[10px] text-brand-500">{new Date(item.created_at).toLocaleString()}</time>{item.status === "unread" && <button type="button" onClick={() => void mark(item.id)} className="text-xs font-bold text-accent-700">Mark as read</button>}</div></div>) : <p className="py-6 text-center text-sm text-brand-500">You’re all caught up.</p>}</div><Link role="menuitem" href={`${base}/notifications`} onClick={() => setOpen(false)} className="mt-2 block rounded-lg bg-brand-900 px-3 py-2 text-center text-sm font-bold text-white">View all notifications</Link></div>}</div>;
}
