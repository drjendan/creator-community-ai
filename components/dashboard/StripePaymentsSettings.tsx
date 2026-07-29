"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";

type StripeState = {
  account: {
    status: string;
    details_submitted?: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    requirements?: { currently_due?: string[]; disabled_reason?: string };
  };
  paymentsEnabled: boolean;
  providerConfigured: boolean;
};

const labels: Record<string, string> = {
  not_connected: "Not connected",
  setup_started: "Setup started",
  action_required: "Action required",
  connected: "Connected",
  payments_enabled: "Payments enabled",
  restricted: "Restricted",
  disconnected: "Disconnected"
};

export function StripePaymentsSettings() {
  const [data, setData] = useState<StripeState | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/stripe/connect", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setData(result); else setMessage(result.error);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(action: "start" | "resume" | "disconnect") {
    if (action === "disconnect" && !window.confirm("Disconnect Stripe for this organization? Paid plans will remain drafts and purchases will be disabled.")) return;
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/stripe/connect", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action })
    });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) return setMessage(result.error);
    if (result.url) window.location.assign(result.url);
    else { setMessage("Stripe was disconnected."); void load(); }
  }

  const status = data?.account.status ?? "not_connected";
  const connected = !["not_connected", "disconnected"].includes(status);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Payments</h1>
        <p className="mt-2 text-sm text-brand-600">Connect this organization&apos;s Stripe account when it is ready to collect payments.</p>
      </div>
      <Card>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <CreditCard className="h-7 w-7 text-accent-700" />
            <h2 className="mt-4 text-xl font-bold text-brand-900">Stripe Connect</h2>
            <p className="mt-2 text-sm text-brand-600">Status: <strong>{labels[status] ?? status}</strong></p>
            <p className="mt-2 max-w-2xl text-sm text-brand-600">
              Free memberships and free content work without Stripe. Paid plans can be prepared as drafts, but cannot be published or purchased until onboarding, payment capabilities, and the UpNexx platform fee are active.
            </p>
            {data?.account.requirements?.disabled_reason && <p className="mt-3 text-sm font-semibold text-danger">{data.account.requirements.disabled_reason}</p>}
            {message && <p className="mt-3 text-sm font-semibold text-brand-700" role="status">{message}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={working || data?.providerConfigured === false} onClick={() => void act(connected ? "resume" : "start")}>
              <ExternalLink className="h-4 w-4" />{connected ? "Continue Stripe setup" : "Connect Stripe"}
            </Button>
            <Button type="button" variant="secondary" disabled={working} onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh status</Button>
            {connected && <Button type="button" variant="secondary" disabled={working} onClick={() => void act("disconnect")}>Disconnect</Button>}
          </div>
        </div>
        {data?.providerConfigured === false && <p className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-brand-700">The UpNexx platform Stripe secret has not been configured by the platform operator.</p>}
      </Card>
    </div>
  );
}
