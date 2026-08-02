"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type CheckoutProps = {
  tenantSlug: string;
  planId: string;
  planType: "free" | "paid";
  hasMonthly: boolean;
  hasAnnual: boolean;
  paidBillingEnabled?: boolean;
};

export function MembershipCheckoutActions({
  tenantSlug,
  planId,
  planType,
  hasMonthly,
  hasAnnual,
  paidBillingEnabled = true
}: CheckoutProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function start(interval: "month" | "year") {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/billing/member", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantSlug, planId, interval, action: "subscribe" })
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "Unable to start membership checkout.");
    if (result.url) window.location.assign(result.url);
    else setMessage("Membership activated. Open Member Home to continue.");
  }

  if (planType === "paid" && !paidBillingEnabled) {
    return <p className="mt-6 text-sm font-semibold text-brand-600">Paid checkout is not available yet.</p>;
  }

  return (
    <div className="mt-6 space-y-2">
      <div className="flex flex-wrap gap-2">
        {planType === "free" ? (
          <Button type="button" disabled={busy} onClick={() => void start("month")}>{busy ? "Activating…" : "Join free"}</Button>
        ) : (
          <>
            {hasMonthly && <Button type="button" disabled={busy} onClick={() => void start("month")}>Choose monthly</Button>}
            {hasAnnual && <Button type="button" variant="secondary" disabled={busy} onClick={() => void start("year")}>Choose annual</Button>}
          </>
        )}
      </div>
      {message && <p role="status" className="text-sm font-semibold text-brand-700">{message}</p>}
    </div>
  );
}

export function MemberBillingPortalButton({ tenantSlug }: { tenantSlug: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function open() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/billing/member", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantSlug, action: "portal", interval: "month" })
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "Unable to open billing management.");
    window.location.assign(result.url);
  }

  return (
    <div className="mt-6 text-center">
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void open()}>{busy ? "Opening…" : "Manage current membership"}</Button>
      {message && <p role="status" className="mt-2 text-sm font-semibold text-brand-700">{message}</p>}
    </div>
  );
}
