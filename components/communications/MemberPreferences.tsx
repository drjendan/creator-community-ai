/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

const categories = [
  ["announcements", "General announcements"], ["newsletters", "Newsletters"], ["new_content", "New-content notifications"],
  ["event_reminders", "Event reminders"], ["course_notifications", "Course notifications"], ["membership_reminders", "Membership reminders"],
  ["community_summaries", "Community activity summaries"], ["direct_messages", "Direct organization messages"], ["weekly_digest", "Weekly digest"]
];

export function MemberPreferences({ tenantSlug }: { tenantSlug: string }) {
  const [preferences, setPreferences] = useState<Record<string, boolean>>(Object.fromEntries(categories.map(([key]) => [key, true])));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/member/communication-preferences?tenantSlug=${encodeURIComponent(tenantSlug)}`, { cache: "no-store" }).then(async (response) => { const result = await response.json(); if (response.ok) setPreferences((current) => ({ ...current, ...Object.fromEntries(result.preferences.map((item: any) => [item.category, item.email_enabled])) })); }); }, [tenantSlug]);
  async function save() {
    setBusy(true); const response = await fetch("/api/member/communication-preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantSlug, preferences }) }); const result = await response.json(); setMessage(response.ok ? "Communication preferences saved." : result.error ?? "Unable to save preferences."); setBusy(false);
  }
  return <div className="space-y-6"><div><h1 className="font-display text-3xl font-extrabold text-brand-900">Communication Preferences</h1><p className="mt-2 text-sm text-brand-600">Choose optional email categories. Essential account and security email remains enabled.</p></div>{message && <p role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</p>}<Card className="space-y-3">{categories.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-brand-100 p-4"><span className="font-semibold text-brand-800">{label}</span><input type="checkbox" checked={preferences[key] !== false} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} className="h-5 w-5 accent-accent-600" /></label>)}<div className="pt-3"><Button type="button" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</Button></div></Card></div>;
}
