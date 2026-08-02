"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import type { MemberNotification } from "@/lib/member-experience";

export function MemberNotifications({ tenantSlug, initialNotifications }: { tenantSlug: string; initialNotifications: MemberNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = notifications.filter((item) => item.status === "unread").length;
  async function mark(id?: string) {
    const response = await fetch("/api/member/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantSlug, id, all: !id }) });
    if (response.ok) setNotifications((current) => current.map((item) => !id || item.id === id ? { ...item, status: "read" } : item));
  }
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Member account</p><h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-extrabold text-brand-900"><Bell className="h-7 w-7" />Notifications</h1><p className="mt-2 text-sm text-brand-600">Updates recorded for your account in this workspace.</p></div>{unread > 0 && <Button type="button" variant="secondary" onClick={() => void mark()}><CheckCheck className="h-4 w-4" />Mark all as read</Button>}</div>{notifications.length ? notifications.map((item) => <Card key={item.id} className={item.status === "unread" ? "border-accent-300 bg-accent-50/30" : ""}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-brand-900">{item.title}</h2>{item.body && <p className="mt-2 text-sm text-brand-600">{item.body}</p>}<time className="mt-3 block text-xs text-brand-500">{new Date(item.created_at).toLocaleString()}</time></div>{item.status === "unread" && <Button type="button" size="sm" variant="secondary" onClick={() => void mark(item.id)}>Mark as read</Button>}</div></Card>) : <Card><div className="py-8 text-center"><Bell className="mx-auto h-8 w-8 text-brand-300" /><p className="mt-3 font-bold text-brand-900">You’re all caught up.</p><p className="mt-1 text-sm text-brand-600">New notifications will appear here when they are recorded.</p></div></Card>}</div>;
}
