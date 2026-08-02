"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type TrialEvent = {
  id: string;
  event_type: string;
  actor_role?: string | null;
  reason?: string | null;
  created_at: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
};

export function TrialManagement({
  tenantId,
  subscription,
  history,
  plans
}: {
  tenantId: string;
  subscription: {
    subscriptionType: string;
    isTrial: boolean;
    isActiveTrial: boolean;
    isExpiredTrial: boolean;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    trialDaysGranted: number | null;
    daysRemaining: number | null;
  };
  history: TrialEvent[];
  plans: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [action, setAction] = useState<"extend" | "end" | "convert">("extend");
  const [days, setDays] = useState(7);
  const [planSlug, setPlanSlug] = useState(plans[0]?.slug ?? "professional");
  const [billingFrequency, setBillingFrequency] = useState("monthly");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setMessage("");
    setError("");
    const payload = action === "extend"
      ? { action, days, reason }
      : action === "convert"
        ? { action, planSlug, billingFrequency, reason }
        : { action, reason };
    const response = await fetch(`/api/platform/tenants/${tenantId}/trial`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error || "Unable to update the trial.");
      return;
    }
    setReason("");
    setMessage(result.message || "Trial updated.");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Subscription type</p>
          <h2 className="mt-2 font-display text-xl font-bold text-brand-900">{subscription.subscriptionType}</h2>
          <p className="mt-2 text-sm text-brand-600">
            {subscription.isActiveTrial
              ? `${subscription.daysRemaining} ${subscription.daysRemaining === 1 ? "day" : "days"} remaining`
              : subscription.isExpiredTrial ? "Trial access is read-only." : "Paid or contracted access"}
          </p>
        </div>
        {subscription.isTrial && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-brand-500">Started</dt><dd className="font-semibold text-brand-900">{formatDate(subscription.trialStartedAt)}</dd></div>
            <div><dt className="text-brand-500">Ends</dt><dd className="font-semibold text-brand-900">{formatDate(subscription.trialEndsAt)}</dd></div>
            <div><dt className="text-brand-500">Days granted</dt><dd className="font-semibold text-brand-900">{subscription.trialDaysGranted ?? "—"}</dd></div>
            <div><dt className="text-brand-500">Status</dt><dd className="font-semibold text-brand-900">{subscription.isExpiredTrial ? "Expired" : "Active"}</dd></div>
          </dl>
        )}
      </div>

      {subscription.isTrial && (
        <div className="mt-6 border-t border-brand-100 pt-6">
          <h3 className="font-display text-lg font-bold text-brand-900">Trial controls</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Action" htmlFor="trial-action">
              <Select id="trial-action" value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
                <option value="extend">Extend trial</option>
                <option value="convert">Convert to paid plan</option>
                <option value="end">End trial early</option>
              </Select>
            </Field>
            {action === "extend" && (
              <Field label="Additional days" htmlFor="trial-days">
                <Input id="trial-days" type="number" min="1" max="365" value={days} onChange={(event) => setDays(Number(event.target.value))} />
              </Field>
            )}
            {action === "convert" && (
              <>
                <Field label="Plan" htmlFor="trial-plan">
                  <Select id="trial-plan" value={planSlug} onChange={(event) => setPlanSlug(event.target.value)}>
                    {plans.map((plan) => <option key={plan.slug} value={plan.slug}>{plan.name}</option>)}
                  </Select>
                </Field>
                <Field label="Billing frequency" htmlFor="trial-frequency">
                  <Select id="trial-frequency" value={billingFrequency} onChange={(event) => setBillingFrequency(event.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                    <option value="none">Contracted</option>
                  </Select>
                </Field>
              </>
            )}
            <div className="md:col-span-2">
              <Field label="Reason" htmlFor="trial-reason">
                <Textarea id="trial-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record why this trial is being changed." />
              </Field>
            </div>
          </div>
          <Button type="button" className="mt-4" disabled={busy || reason.trim().length < 5} onClick={() => void submit()}>
            {busy ? "Updating…" : action === "extend" ? "Extend Trial" : action === "convert" ? "Convert Trial" : "End Trial"}
          </Button>
          {message && <p role="status" className="mt-3 text-sm font-semibold text-success-strong">{message}</p>}
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        </div>
      )}

      <div className="mt-6 border-t border-brand-100 pt-6">
        <h3 className="font-display text-lg font-bold text-brand-900">Trial history</h3>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-brand-500">No trial events recorded.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {history.map((event) => (
              <li key={event.id} className="rounded-xl border border-brand-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold capitalize text-brand-900">{event.event_type.replaceAll("_", " ")}</p>
                  <time className="text-xs text-brand-500" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                </div>
                {event.reason && <p className="mt-1 text-sm text-brand-600">{event.reason}</p>}
                {event.actor_role && <p className="mt-1 text-xs capitalize text-brand-500">By {event.actor_role.replaceAll("_", " ")}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}
