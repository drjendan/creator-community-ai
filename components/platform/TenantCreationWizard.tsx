"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Gift, Sparkles } from "lucide-react";
import { createTenant } from "@/app/platform-admin/tenants/actions";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import {
  featureCatalog, membershipTemplateIds, membershipTemplates,
  platformPlanSlugs, tenantTypeLabels, tenantTypes
} from "@/lib/subscriptions";

type FeatureKey = (typeof featureCatalog)[number]["key"];

const steps = [
  "Organization", "Platform Subscription", "Feature Entitlements", "Branding",
  "Audience Memberships", "Administrator", "Review"
];

type WizardState = {
  name: string; slug: string; tenantType: string; ownerEmail: string;
  planSlug: string; billingFrequency: string; subscriptionStatus: string;
  trialDays: string; customPrice: string; aiCreditAllowance: string;
  primaryColor: string; accentColor: string; membershipTemplate: string;
};

const initialState: WizardState = {
  name: "", slug: "", tenantType: "podcaster", ownerEmail: "",
  planSlug: "creator", billingFrequency: "monthly", subscriptionStatus: "active",
  trialDays: "0", customPrice: "", aiCreditAllowance: "1000",
  primaryColor: "#102a56", accentColor: "#b8e51d", membershipTemplate: "free_premium"
};

export function TenantCreationWizard({ authorized }: { authorized: boolean }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState(initialState);
  const [features, setFeatures] = useState<Set<FeatureKey>>(() => new Set(featureCatalog.slice(0, 6).map((feature) => feature.key)));
  const selectedTemplate = membershipTemplates[state.membershipTemplate as keyof typeof membershipTemplates];

  const canContinue = useMemo(() => {
    if (step === 0) return state.name.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.slug);
    if (step === 5) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.ownerEmail);
    return true;
  }, [state, step]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function toggleFeature(key: FeatureKey) {
    setFeatures((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <Card id="new-tenant" className="scroll-mt-24">
      <div className="mb-7">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {steps.map((label, index) => (
            <div key={label} className="flex min-w-fit items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${index <= step ? "bg-accent-600 text-white" : "bg-brand-100 text-brand-500"}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>
              <span className={`hidden text-xs font-bold xl:block ${index === step ? "text-brand-900" : "text-brand-400"}`}>{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100"><div className="h-full bg-accent-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>

      <form action={createTenant}>
        <input type="hidden" name="name" value={state.name} />
        <input type="hidden" name="slug" value={state.slug} />
        <input type="hidden" name="tenantType" value={state.tenantType} />
        <input type="hidden" name="ownerEmail" value={state.ownerEmail} />
        <input type="hidden" name="planSlug" value={state.planSlug} />
        <input type="hidden" name="billingFrequency" value={state.billingFrequency} />
        <input type="hidden" name="subscriptionStatus" value={state.subscriptionStatus} />
        <input type="hidden" name="trialDays" value={state.trialDays} />
        <input type="hidden" name="customPrice" value={state.customPrice} />
        <input type="hidden" name="aiCreditAllowance" value={state.aiCreditAllowance} />
        <input type="hidden" name="primaryColor" value={state.primaryColor} />
        <input type="hidden" name="accentColor" value={state.accentColor} />
        <input type="hidden" name="membershipTemplate" value={state.membershipTemplate} />
        <input type="hidden" name="features" value={[...features].join(",")} />

        <div className="min-h-[360px]">
          {step === 0 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Organization</h2><p className="mt-2 text-sm text-brand-500">Create one configurable workspace; the business type changes terminology and recommendations, not the application.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Organization name" htmlFor="wizard-name" required><Input id="wizard-name" value={state.name} onChange={(event) => update("name", event.target.value)} placeholder="The Creator Podcast" /></Field><Field label="Workspace URL" htmlFor="wizard-slug" required><Input id="wizard-slug" value={state.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} placeholder="the-creator-podcast" /></Field><Field label="Business type" htmlFor="wizard-type"><Select id="wizard-type" value={state.tenantType} onChange={(event) => update("tenantType", event.target.value)}>{tenantTypes.map((type) => <option key={type} value={type}>{tenantTypeLabels[type]}</option>)}</Select></Field></div></div>}

          {step === 1 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Platform subscription</h2><p className="mt-2 text-sm text-brand-500">This is what the tenant pays UpNexx. It is separate from audience memberships.</p><div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Platform plan" htmlFor="wizard-plan"><Select id="wizard-plan" value={state.planSlug} onChange={(event) => { const plan = event.target.value; update("planSlug", plan); if (plan === "complimentary") { update("subscriptionStatus", "complimentary"); update("billingFrequency", "none"); } }}>{platformPlanSlugs.map((plan) => <option key={plan} value={plan}>{plan[0].toUpperCase() + plan.slice(1)}</option>)}</Select></Field><Field label="Status" htmlFor="wizard-status"><Select id="wizard-status" value={state.subscriptionStatus} onChange={(event) => update("subscriptionStatus", event.target.value)}><option value="active">Active</option><option value="trialing">Trialing</option><option value="past_due">Past due</option><option value="canceled">Canceled</option><option value="complimentary">Complimentary</option></Select></Field><Field label="Billing frequency" htmlFor="wizard-frequency"><Select id="wizard-frequency" value={state.billingFrequency} onChange={(event) => update("billingFrequency", event.target.value)}><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="custom">Custom</option><option value="none">None</option></Select></Field><Field label="Trial days" htmlFor="wizard-trial"><Input id="wizard-trial" type="number" min="0" value={state.trialDays} onChange={(event) => update("trialDays", event.target.value)} /></Field><Field label="Custom price" htmlFor="wizard-price"><Input id="wizard-price" type="number" min="0" step="0.01" value={state.customPrice} onChange={(event) => update("customPrice", event.target.value)} placeholder="Optional" /></Field><Field label="Monthly AI credits" htmlFor="wizard-credits"><Input id="wizard-credits" type="number" min="0" value={state.aiCreditAllowance} onChange={(event) => update("aiCreditAllowance", event.target.value)} /></Field></div></div>}

          {step === 2 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Feature entitlements</h2><p className="mt-2 text-sm text-brand-500">Override the selected plan for this tenant. These controls are enforced server-side after migration 0006 is installed.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{featureCatalog.map((feature) => <label key={feature.key} className={`flex items-center gap-3 rounded-xl border p-4 ${features.has(feature.key) ? "border-accent-300 bg-accent-50" : "border-brand-200"}`}><input type="checkbox" checked={features.has(feature.key)} onChange={() => toggleFeature(feature.key)} /><span className="text-sm font-bold text-brand-800">{feature.label}</span></label>)}</div></div>}

          {step === 3 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Starting brand</h2><p className="mt-2 text-sm text-brand-500">The tenant administrator can change these colors and upload a logo later.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Primary color" htmlFor="wizard-primary"><Input id="wizard-primary" type="color" value={state.primaryColor} onChange={(event) => update("primaryColor", event.target.value)} className="h-14 p-1" /></Field><Field label="Accent color" htmlFor="wizard-accent"><Input id="wizard-accent" type="color" value={state.accentColor} onChange={(event) => update("accentColor", event.target.value)} className="h-14 p-1" /></Field></div></div>}

          {step === 4 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Audience membership template</h2><p className="mt-2 text-sm text-brand-500">These are the plans the tenant offers its own audience—not its UpNexx subscription.</p><div className="mt-6 grid gap-3 md:grid-cols-2">{membershipTemplateIds.map((id) => <button key={id} type="button" onClick={() => update("membershipTemplate", id)} className={`rounded-xl border p-4 text-left ${state.membershipTemplate === id ? "border-accent-500 bg-accent-50 ring-2 ring-accent-200" : "border-brand-200"}`}><span className="font-bold text-brand-900">{membershipTemplates[id].label}</span><span className="mt-1 block text-xs text-brand-500">{membershipTemplates[id].plans.length ? membershipTemplates[id].plans.map((plan) => plan.name).join(" · ") : "Start with no plans"}</span></button>)}</div></div>}

          {step === 5 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Tenant administrator invitation</h2><p className="mt-2 text-sm text-brand-500">An invitation will be sent if this email does not already belong to a UpNexx user.</p><div className="mt-6 max-w-xl"><Field label="Administrator email" htmlFor="wizard-email" required><Input id="wizard-email" type="email" value={state.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} placeholder="creator@example.com" /></Field></div></div>}

          {step === 6 && <div><h2 className="font-display text-2xl font-bold text-brand-900">Review and create</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><Review label="Tenant" value={`${state.name} (${state.slug})`} /><Review label="Business type" value={tenantTypeLabels[state.tenantType as keyof typeof tenantTypeLabels]} /><Review label="Platform subscription" value={`${state.planSlug} · ${state.subscriptionStatus} · ${state.billingFrequency}`} /><Review label="AI allowance" value={`${Number(state.aiCreditAllowance).toLocaleString()} credits/month`} /><Review label="Enabled features" value={`${features.size} selected`} /><Review label="Membership template" value={selectedTemplate.label} /><Review label="Administrator" value={state.ownerEmail} /><Review label="Billing status" value={state.planSlug === "complimentary" ? "Complimentary—no platform charge" : state.subscriptionStatus} /></div><div className="mt-5 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-success-strong"><div className="flex gap-2"><Gift className="h-5 w-5" /><strong>Ready to provision</strong></div><p className="mt-1">Creating the tenant also creates its subscription, feature overrides, membership template, AI allowance, branding, owner assignment, and audit record.</p></div></div>}
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-brand-100 pt-5">
          <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft className="h-4 w-4" />Back</Button>
          {step < steps.length - 1 ? <Button type="button" disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue<ArrowRight className="h-4 w-4" /></Button> : <Button type="submit" disabled={!authorized}><Sparkles className="h-4 w-4" />Create tenant and invite owner</Button>}
        </div>
      </form>
    </Card>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-brand-200 bg-brand-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-500">{label}</p><p className="mt-1 font-semibold capitalize text-brand-900">{value}</p></div>;
}

