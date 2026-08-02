"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function TenantPlatformBillingActions({ planSlug, monthlyEnabled, annualEnabled }: { planSlug: string; monthlyEnabled: boolean; annualEnabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "checkout" | "portal", interval: "month" | "year" = "month") {
    setBusy(true); setMessage("");
    const response = await fetch("/api/billing/platform", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, planSlug, interval }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "Unable to start Stripe billing.");
    if (result.url) window.location.assign(result.url);
  }
  return <div className="mt-auto space-y-2 pt-6"><div className="flex flex-wrap gap-2">{monthlyEnabled && <Button type="button" disabled={busy} onClick={() => void act("checkout", "month")}>Choose monthly</Button>}{annualEnabled && <Button type="button" variant="secondary" disabled={busy} onClick={() => void act("checkout", "year")}>Choose annual</Button>}{!monthlyEnabled && !annualEnabled && <a href={`mailto:sales@upnexx.net?subject=${encodeURIComponent(`Configure ${planSlug} billing`)}`} className="inline-flex rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-bold text-white">Contact sales</a>}</div>{message && <p role="status" className="text-sm font-semibold text-brand-700">{message}</p>}</div>;
}

export function BillingPortalButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function openPortal() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/billing/platform", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "portal", interval: "month" }) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "Unable to open the billing portal.");
    window.location.assign(result.url);
  }
  return <div><Button type="button" variant="secondary" disabled={busy} onClick={() => void openPortal()}>{busy ? "Opening…" : "Manage billing"}</Button>{message && <p role="status" className="mt-2 text-sm font-semibold text-brand-700">{message}</p>}</div>;
}
