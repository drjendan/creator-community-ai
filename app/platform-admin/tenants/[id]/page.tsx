/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateTenant } from "../actions";
import { AiProviderSettings } from "@/components/dashboard/AiProviderSettings";
import { TenantLifecycleManager } from "@/components/platform/TenantLifecycleManager";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasValidEncryptionConfiguration } from "@/lib/security/api-key-encryption";
import { featureCatalog, platformPlanSlugs, tenantTypeLabels, tenantTypes } from "@/lib/subscriptions";

export default async function EditTenantPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setupAI?: string }>;
}) {
  const { id } = await params;
  const { setupAI } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const platformRole = String(user?.app_metadata?.platform_role ?? "");
  if (!user || !["platform_owner", "platform_admin", "super_admin"].includes(platformRole)) notFound();

  const admin = createAdminClient();
  const [{ data: tenant }, { data: subscription }, { data: aiCredentialPolicy }, { data: entitlements }, { data: ownerMembership }] = await Promise.all([
    admin.from("tenants").select("id,name,slug,status,tenant_type,owner_invited_at,owner_invitation_last_sent_at,owner_invitation_send_count,owner_activated_at").eq("id", id).maybeSingle(),
    admin.from("tenant_subscriptions").select("status,billing_frequency,custom_price,ai_credit_allowance,platform_plans(slug)").eq("tenant_id", id).maybeSingle(),
    admin.from("feature_flags").select("enabled").eq("tenant_id", id).eq("key", "tenant_can_manage_ai_credentials").maybeSingle(),
    admin.from("tenant_feature_entitlements").select("feature_key,enabled").eq("tenant_id", id),
    admin.from("tenant_memberships").select("user_id,created_at").eq("tenant_id", id).eq("role", "tenant_owner").maybeSingle()
  ]);
  if (!tenant || tenant.status === "deleted") notFound();

  let owner = null;
  if (ownerMembership) {
    const [{ data: auth }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(ownerMembership.user_id),
      admin.from("profiles").select("full_name").eq("id", ownerMembership.user_id).maybeSingle()
    ]);
    if (auth.user?.email) {
      const activatedAt = auth.user.email_confirmed_at || auth.user.last_sign_in_at || tenant.owner_activated_at;
      if (activatedAt && !tenant.owner_activated_at) {
        await admin.from("tenants").update({
          owner_activated_at: activatedAt,
          status: tenant.status === "pending" ? "active" : tenant.status,
          updated_at: new Date().toISOString()
        }).eq("id", tenant.id);
      }
      owner = {
        name: profile?.full_name || auth.user.user_metadata?.full_name || auth.user.email,
        email: auth.user.email,
        invitationStatus: activatedAt ? "Activated" : tenant.owner_invitation_last_sent_at ? "Sent" : "Pending",
        originallyInvitedAt: tenant.owner_invited_at || ownerMembership.created_at,
        lastSentAt: tenant.owner_invitation_last_sent_at,
        sendCount: Number(tenant.owner_invitation_send_count ?? 0),
        activated: Boolean(activatedAt),
        activatedAt
      };
    }
  }

  const relatedPlan = subscription?.platform_plans as unknown as { slug?: string } | null;
  const enabledFeatures = new Set((entitlements ?? []).filter((item: any) => item.enabled).map((item: any) => item.feature_key));
  const live = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && hasValidEncryptionConfiguration());

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button href="/platform-admin/tenants" variant="secondary"><ArrowLeft className="h-4 w-4" />All tenants</Button>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Tenant management</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Edit {tenant.name}</h1>
        <p className="mt-2 text-sm text-brand-500">{tenant.slug} · <span className="capitalize">{tenant.status}</span></p>
      </div>

      {setupAI === "1" && <div role="status" className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-semibold text-brand-800">Tenant created. Enter, test, and save its AI provider credential below.</div>}

      <TenantLifecycleManager
        tenant={{ id: tenant.id, name: tenant.name, status: tenant.status }}
        owner={owner}
        canDelete={["platform_owner", "super_admin"].includes(platformRole)}
      />

      <Card>
        <h2 className="mb-5 font-display text-xl font-bold text-brand-900">Subscription and entitlements</h2>
        <form action={updateTenant} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Field label="Organization name" htmlFor="edit-name"><Input id="edit-name" name="name" defaultValue={tenant.name} required /></Field>
          <Field label="Business type" htmlFor="edit-type"><Select id="edit-type" name="tenantType" defaultValue={tenant.tenant_type ?? "podcaster"}>{tenantTypes.map((type) => <option key={type} value={type}>{tenantTypeLabels[type]}</option>)}</Select></Field>
          <Field label="Platform plan" htmlFor="edit-plan"><Select id="edit-plan" name="planSlug" defaultValue={relatedPlan?.slug ?? "creator"}>{platformPlanSlugs.map((plan) => <option key={plan} value={plan}>{plan[0].toUpperCase() + plan.slice(1)}</option>)}</Select></Field>
          <Field label="Subscription status" htmlFor="edit-subscription-status"><Select id="edit-subscription-status" name="subscriptionStatus" defaultValue={subscription?.status ?? "active"}><option value="trialing">Trialing</option><option value="active">Active</option><option value="past_due">Past due</option><option value="canceled">Canceled</option></Select></Field>
          <Field label="Billing frequency" htmlFor="edit-frequency"><Select id="edit-frequency" name="billingFrequency" defaultValue={subscription?.billing_frequency ?? "monthly"}><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="custom">Custom</option><option value="none">None</option></Select></Field>
          <Field label="Custom price" htmlFor="edit-price"><Input id="edit-price" name="customPrice" type="number" min="0" step="0.01" defaultValue={subscription?.custom_price ?? ""} /></Field>
          <Field label="Monthly AI credits" htmlFor="edit-credits"><Input id="edit-credits" name="aiCreditAllowance" type="number" min="0" defaultValue={subscription?.ai_credit_allowance ?? 0} required /></Field>
          <fieldset className="md:col-span-2"><legend className="font-bold text-brand-900">Feature entitlements</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{featureCatalog.map((feature) => <label key={feature.key} className="flex items-center gap-3 rounded-lg border border-brand-200 p-3 text-sm font-semibold"><input type="checkbox" name="features" value={feature.key} defaultChecked={enabledFeatures.has(feature.key)} />{feature.label}</label>)}</div></fieldset>
          <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4"><input type="checkbox" name="tenantCanManageAiCredentials" defaultChecked={aiCredentialPolicy?.enabled !== false} className="mt-1 h-4 w-4 accent-accent-600" /><span><span className="block text-sm font-bold text-brand-900">Tenant administrators can manage AI credentials</span><span className="block text-xs text-brand-500">When disabled, tenant administrators can view provider status but only platform administrators can change credentials.</span></span></label>
          <div className="md:col-span-2"><Button type="submit">Save tenant subscription and entitlements</Button></div>
        </form>
      </Card>

      <div id="ai-configuration" className="scroll-mt-24 border-t border-brand-200 pt-6">
        <AiProviderSettings tenantId={tenant.id} tenantName={tenant.name} live={live} context="platform" />
      </div>
    </div>
  );
}
