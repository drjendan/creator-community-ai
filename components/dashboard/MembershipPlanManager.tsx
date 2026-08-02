"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Edit3, Plus, RefreshCw, Trash2, Users, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Plan = {
  id: string; name: string; description?: string; plan_type: "free" | "paid";
  price_monthly: number; price_annual: number; currency: string; trial_days: number;
  community_access: boolean; ai_access: boolean; ai_monthly_allowance: number;
  member_limit?: number; visibility: "public" | "private"; status: "active" | "inactive";
  sort_order: number; access_rules?: Record<string, boolean>; benefits?: string[]; color?: string;
  created_from_template?: boolean; template_key?: string; payment_setup_required?: boolean;
};

export function MembershipPlanManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [payments, setPayments] = useState({ status: "not_connected", enabled: false });

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/membership-plans", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      setPlans(result.plans);
      setPayments(result.payments ?? { status: "not_connected", enabled: false });
    } else setMessage(result.error ?? "Unable to load membership plans.");
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/membership-plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id, name: data.get("name"), description: data.get("description"),
        planType: data.get("planType"), monthlyPrice: data.get("monthlyPrice"), annualPrice: data.get("annualPrice"),
        currency: data.get("currency"), trialDays: data.get("trialDays"),
        communityAccess: data.get("communityAccess") === "on", aiAccess: data.get("aiAccess") === "on",
        aiMonthlyAllowance: data.get("aiMonthlyAllowance"), memberLimit: data.get("memberLimit") ? Number(data.get("memberLimit")) : null,
        visibility: data.get("visibility"), status: data.get("status"), sortOrder: data.get("sortOrder"),
        benefits: String(data.get("benefits") ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
        color: data.get("color"),
        includedContent: {
          podcasts: data.get("podcasts") === "on", courses: data.get("courses") === "on",
          resources: data.get("resources") === "on", events: data.get("events") === "on"
        }
      })
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error ?? "Unable to save the membership plan.");
    setMessage(result.billingWarning
      ? `Plan saved as inactive because Stripe price synchronization failed: ${result.billingWarning}`
      : result.paymentSetupRequired
      ? "Paid plan saved as a draft. Connect and finish Stripe setup before publishing it."
      : result.metadataDeferred
      ? "Membership plan saved. Apply database migration 0008 to enable colors, benefits, and template metadata."
      : "Audience membership plan saved.");
    setOpen(false); setEditing(null); await load();
  }

  async function remove(plan: Plan) {
    if (!window.confirm(`Delete “${plan.name}”?`)) return;
    const response = await fetch(`/api/membership-plans?id=${plan.id}`, { method: "DELETE" });
    const result = await response.json();
    setMessage(response.ok ? "Membership plan deleted." : result.error ?? "Unable to delete the plan.");
    if (response.ok) await load();
  }

  function edit(plan: Plan | null) { setEditing(plan); setOpen(true); setMessage(""); }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Audience revenue</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Membership Plans</h1><p className="mt-2 max-w-2xl text-sm text-brand-600">Create the free and paid plans this tenant offers its audience. These plans are separate from the tenant&apos;s UpNexx platform subscription.</p></div><Button type="button" onClick={() => edit(null)}><Plus className="h-4 w-4" />Add membership plan</Button></div>
    {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
    {!payments.enabled && <div className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm text-brand-700"><strong>Stripe is not connected.</strong> Free plans work normally. Paid plans are saved as drafts until payment setup is complete. <Link className="font-bold text-accent-700 underline" href="/dashboard/settings/integrations/payments">Connect Stripe</Link></div>}
    {plans.some((plan) => plan.created_from_template) && <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-brand-700"><strong>Editable starter plans:</strong> We created these memberships from the template selected during setup. You can customize them now or return to them later.</div>}

    {open && <Card><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-bold text-brand-900">{editing ? "Edit" : "Add"} audience plan</h2><button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={save} className="grid gap-5 md:grid-cols-2">
      <Field label="Plan name" htmlFor="membership-name" required><Input id="membership-name" name="name" defaultValue={editing?.name} required /></Field>
      <Field label="Plan type" htmlFor="membership-type"><Select id="membership-type" name="planType" defaultValue={editing?.plan_type ?? "free"}><option value="free">Free</option><option value="paid">Paid</option></Select></Field>
      <Field label="Description" htmlFor="membership-description" className="md:col-span-2"><Textarea id="membership-description" name="description" defaultValue={editing?.description} /></Field>
      <Field label="Monthly price" htmlFor="membership-monthly"><Input id="membership-monthly" name="monthlyPrice" type="number" min="0" step="0.01" defaultValue={editing?.price_monthly ?? 0} /></Field>
      <Field label="Annual price" htmlFor="membership-annual"><Input id="membership-annual" name="annualPrice" type="number" min="0" step="0.01" defaultValue={editing?.price_annual ?? 0} /></Field>
      <Field label="Currency" htmlFor="membership-currency"><Input id="membership-currency" name="currency" maxLength={3} defaultValue={editing?.currency ?? "USD"} /></Field>
      <Field label="Trial days" htmlFor="membership-trial"><Input id="membership-trial" name="trialDays" type="number" min="0" defaultValue={editing?.trial_days ?? 0} /></Field>
      <Field label="AI monthly allowance" htmlFor="membership-ai"><Input id="membership-ai" name="aiMonthlyAllowance" type="number" min="0" defaultValue={editing?.ai_monthly_allowance ?? 0} /></Field>
      <Field label="Member limit" htmlFor="membership-limit"><Input id="membership-limit" name="memberLimit" type="number" min="1" defaultValue={editing?.member_limit ?? ""} placeholder="Unlimited" /></Field>
      <Field label="Visibility" htmlFor="membership-visibility"><Select id="membership-visibility" name="visibility" defaultValue={editing?.visibility ?? "public"}><option value="public">Public</option><option value="private">Private / invite only</option></Select></Field>
      <Field label="Status" htmlFor="membership-status"><Select id="membership-status" name="status" defaultValue={editing?.status ?? "active"}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
      <Field label="Sort order" htmlFor="membership-order"><Input id="membership-order" name="sortOrder" type="number" min="0" defaultValue={editing?.sort_order ?? 0} /></Field>
      <Field label="Plan color" htmlFor="membership-color"><Input id="membership-color" name="color" type="color" defaultValue={editing?.color ?? "#7c3aed"} className="h-12 p-1" /></Field>
      <Field label="Benefits" htmlFor="membership-benefits" hint="Enter one editable benefit per line." className="md:col-span-2"><Textarea id="membership-benefits" name="benefits" defaultValue={editing?.benefits?.join("\n") ?? ""} /></Field>
      <div className="space-y-3 md:col-span-2"><p className="text-sm font-bold text-brand-900">Included access</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["podcasts","Podcasts"],["courses","Courses"],["resources","Resources"],["events","Events"],["communityAccess","Community"],["aiAccess","Member AI Assistant"]].map(([key,label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-brand-200 p-3 text-sm font-semibold text-brand-700"><input name={key} type="checkbox" defaultChecked={key === "communityAccess" ? editing?.community_access : key === "aiAccess" ? editing?.ai_access : editing?.access_rules?.[key] ?? true} />{label}</label>)}</div></div>
      <div className="flex gap-3 md:col-span-2"><Button type="submit">Save membership plan</Button><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button></div>
    </form></Card>}

    {loading ? <Card><p className="flex items-center gap-2 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" />Loading plans…</p></Card> : plans.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <Card key={plan.id} className="relative flex flex-col overflow-hidden"><span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: plan.color ?? "#7c3aed" }} /><div className="flex items-center justify-between"><span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold capitalize text-accent-800">{plan.plan_type}</span><span className="text-xs font-bold capitalize text-brand-500">{plan.status}</span></div><Users className="mt-6 h-8 w-8 text-accent-600" /><h2 className="mt-4 font-display text-2xl font-bold text-brand-900">{plan.name}</h2><p className="mt-2 text-sm leading-6 text-brand-600">{plan.description || "Audience membership"}</p><p className="mt-5 text-2xl font-extrabold text-brand-900">{plan.plan_type === "free" ? "Free" : `$${Number(plan.price_monthly).toFixed(2)}`}<span className="text-sm font-medium text-brand-500">{plan.plan_type === "paid" && "/month"}</span></p><ul className="mt-5 space-y-2 text-sm text-brand-600">{plan.benefits?.map((benefit) => <li key={benefit} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{benefit}</li>)}{plan.community_access && <li className="flex gap-2"><Check className="h-4 w-4 text-success" />Community access</li>}{plan.ai_access && <li className="flex gap-2"><Check className="h-4 w-4 text-success" />{plan.ai_monthly_allowance} AI credits monthly</li>}<li className="flex gap-2"><Check className="h-4 w-4 text-success" />{plan.visibility === "public" ? "Publicly available" : "Invite only"}</li></ul><div className="mt-auto flex justify-end gap-2 pt-6"><button onClick={() => edit(plan)} aria-label={`Edit ${plan.name}`} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50"><Edit3 className="h-4 w-4" /></button><button onClick={() => void remove(plan)} aria-label={`Delete ${plan.name}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></Card>)}</div> : <Card><p className="text-center text-brand-500">No audience membership plans yet. Add one or create a tenant with a membership template.</p></Card>}
  </div>;
}

