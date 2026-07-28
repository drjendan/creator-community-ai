"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { featureCatalog, membershipTemplateIds, membershipTemplates, platformPlanSlugs, tenantTypes } from "@/lib/subscriptions";

const tenantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tenantType: z.enum(tenantTypes),
  ownerEmail: z.string().trim().toLowerCase().email(),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  planSlug: z.enum(platformPlanSlugs),
  billingFrequency: z.enum(["monthly", "annual", "custom", "none"]),
  subscriptionStatus: z.enum(["trialing", "active", "past_due", "canceled", "complimentary"]),
  trialDays: z.coerce.number().int().min(0).max(365),
  customPrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  aiCreditAllowance: z.coerce.number().int().min(0).max(100000000),
  features: z.array(z.string()),
  membershipTemplate: z.enum(membershipTemplateIds)
});

const platformRoles = new Set(["platform_owner", "platform_admin"]);

function destination(message: string, type: "success" | "error") {
  return `/platform-admin/tenants?${type}=${encodeURIComponent(message)}`;
}

export async function createTenant(formData: FormData) {
  const parsed = tenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    tenantType: formData.get("tenantType"),
    ownerEmail: formData.get("ownerEmail"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    planSlug: formData.get("planSlug"),
    billingFrequency: formData.get("billingFrequency"),
    subscriptionStatus: formData.get("subscriptionStatus"),
    trialDays: formData.get("trialDays") ?? 0,
    customPrice: formData.get("customPrice") ?? "",
    aiCreditAllowance: formData.get("aiCreditAllowance") ?? 0,
    features: String(formData.get("features") ?? "").split(",").filter(Boolean),
    membershipTemplate: formData.get("membershipTemplate")
  });

  if (!parsed.success) {
    redirect(destination("Check the tenant name, URL slug, owner email, and brand colors.", "error"));
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const platformRole = user?.app_metadata?.platform_role;

  if (!user || !platformRoles.has(platformRole)) {
    redirect(destination("Only a platform owner or platform administrator can create tenants.", "error"));
  }

  const admin = createAdminClient();
  const input = parsed.data;
  let resultMessage = "";
  let resultType: "success" | "error" = "success";

  try {
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: input.name,
        slug: input.slug,
        status: "active",
        tenant_type: input.tenantType,
        updated_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (tenantError) throw tenantError;

    const { error: brandingError } = await admin.from("tenant_branding").upsert({
      tenant_id: tenant.id,
      primary_color: input.primaryColor,
      secondary_color: "#7C3AED",
      accent_color: input.accentColor,
      background_color: "#ffffff",
      footer_text: "Powered by UpNexx · Nexx Jenn Technologies"
    });
    if (brandingError) throw brandingError;

    const { data: users, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    if (usersError) throw usersError;

    let owner = users.users.find((candidate) => candidate.email?.toLowerCase() === input.ownerEmail);
    let invitationSent = false;

    if (!owner) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        input.ownerEmail,
        {
          redirectTo: `${appUrl}/login`,
          data: { invited_to_tenant: tenant.id, invited_role: "tenant_owner" }
        }
      );
      if (inviteError) throw inviteError;
      owner = invitation.user;
      invitationSent = true;
    }

    if (!owner) throw new Error("The tenant owner account could not be created.");

    const { error: membershipError } = await admin.from("tenant_memberships").upsert(
      {
        tenant_id: tenant.id,
        user_id: owner.id,
        role: "tenant_owner",
        status: "active",
        updated_at: new Date().toISOString()
      },
      { onConflict: "tenant_id,user_id" }
    );
    if (membershipError) throw membershipError;

    const { error: aiSettingsError } = await admin.from("tenant_ai_settings").upsert(
      { tenant_id: tenant.id, enabled: false, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" }
    );
    if (aiSettingsError) throw aiSettingsError;

    const { data: plan, error: planError } = await admin.from("platform_plans").select("id,ai_credit_allowance").eq("slug", input.planSlug).single();
    if (planError || !plan) throw planError ?? new Error("The selected platform plan is unavailable.");
    const now = new Date();
    const trialEndsAt = input.trialDays > 0 ? new Date(now.getTime() + input.trialDays * 86400000).toISOString() : null;
    const complimentary = input.planSlug === "complimentary" || input.subscriptionStatus === "complimentary";
    const { error: subscriptionError } = await admin.from("tenant_subscriptions").upsert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      status: complimentary ? "active" : input.subscriptionStatus,
      billing_frequency: complimentary ? "none" : input.billingFrequency,
      trial_starts_at: input.trialDays ? now.toISOString() : null,
      trial_ends_at: trialEndsAt,
      starts_at: now.toISOString(),
      custom_price: input.customPrice === "" ? null : input.customPrice,
      complimentary,
      ai_credit_allowance: input.aiCreditAllowance || plan.ai_credit_allowance,
      current_ai_usage: 0,
      updated_at: now.toISOString()
    }, { onConflict: "tenant_id" });
    if (subscriptionError) throw subscriptionError;

    const allowedFeatures = new Set(featureCatalog.map((feature) => feature.key));
    const entitlements = input.features.filter((key) => allowedFeatures.has(key as never)).map((featureKey) => ({
      tenant_id: tenant.id,
      feature_key: featureKey,
      enabled: true,
      source: "override",
      updated_at: now.toISOString()
    }));
    if (entitlements.length) {
      const { error: entitlementError } = await admin.from("tenant_feature_entitlements").upsert(entitlements, { onConflict: "tenant_id,feature_key" });
      if (entitlementError) throw entitlementError;
    }

    const template = membershipTemplates[input.membershipTemplate];
    if (template.plans.length) {
      const planRows = template.plans.map((membershipPlan) => ({
        tenant_id: tenant.id,
        name: membershipPlan.name,
        slug: `${membershipPlan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${tenant.id.slice(0, 6)}`,
        description: membershipPlan.description,
        plan_type: membershipPlan.planType,
        price_monthly: membershipPlan.monthlyPrice,
        price_annual: membershipPlan.annualPrice,
        currency: "USD",
        community_access: membershipPlan.communityAccess,
        ai_access: membershipPlan.aiAccess,
        ai_monthly_allowance: membershipPlan.aiMonthlyAllowance,
        visibility: "public",
        status: "active",
        sort_order: membershipPlan.sortOrder,
        access_rules: {}
      }));
      const { error: membershipPlansError } = await admin.from("tenant_membership_plans").insert(planRows);
      if (membershipPlansError) throw membershipPlansError;
    }

    if (complimentary) {
      const { error: complimentaryError } = await admin.from("feature_flags").upsert(
        {
          tenant_id: tenant.id,
          key: "platform_complimentary_access",
          enabled: true,
          configuration: {
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            reason: "Platform administrator grant"
          },
          updated_at: new Date().toISOString()
        },
        { onConflict: "tenant_id,key" }
      );
      if (complimentaryError) throw complimentaryError;
    }

    await admin.from("audit_logs").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      action: "platform.tenant.created",
      entity_type: "tenant",
      entity_id: tenant.id,
      metadata: {
        owner_email: input.ownerEmail,
        tenant_type: input.tenantType,
        platform_plan: input.planSlug,
        complimentary,
        membership_template: input.membershipTemplate,
        ai_credit_allowance: input.aiCreditAllowance || plan.ai_credit_allowance,
        features: input.features,
        invitation_sent: invitationSent
      }
    });

    resultMessage = invitationSent
      ? `${input.name} was created and an owner invitation was sent to ${input.ownerEmail}.`
      : `${input.name} was created and ${input.ownerEmail} was assigned as its owner.`;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const keyProblem = /not_admin|user not allowed|row-level security|permission denied/i.test(detail);
    resultMessage = keyProblem
      ? "The server admin key is not authorized. Add the Supabase secret/service-role key to .env.local and restart UpNexx."
      : `Tenant setup failed: ${detail}`;
    resultType = "error";
  }

  redirect(destination(resultMessage, resultType));
}

const updateSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  tenantType: z.enum(tenantTypes),
  status: z.enum(["active", "suspended"]),
  planSlug: z.enum(platformPlanSlugs),
  subscriptionStatus: z.enum(["trialing", "active", "past_due", "canceled"]),
  billingFrequency: z.enum(["monthly", "annual", "custom", "none"]),
  aiCreditAllowance: z.coerce.number().int().min(0),
  customPrice: z.union([z.coerce.number().min(0), z.literal("")]).optional()
});

export async function updateTenant(formData: FormData) {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(destination("Check the tenant subscription fields.", "error"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !platformRoles.has(user.app_metadata?.platform_role)) redirect(destination("Platform administrator access is required.", "error"));
  const admin = createAdminClient();
  const input = parsed.data;
  const { data: plan, error: planError } = await admin.from("platform_plans").select("id").eq("slug", input.planSlug).single();
  if (planError || !plan) redirect(destination("The selected platform plan is unavailable.", "error"));
  const [{ error: tenantError }, { error: subscriptionError }] = await Promise.all([
    admin.from("tenants").update({ name: input.name, tenant_type: input.tenantType, status: input.status, updated_at: new Date().toISOString() }).eq("id", input.tenantId),
    admin.from("tenant_subscriptions").upsert({
      tenant_id: input.tenantId, plan_id: plan.id, status: input.subscriptionStatus,
      billing_frequency: input.billingFrequency, custom_price: input.customPrice === "" ? null : input.customPrice,
      complimentary: input.planSlug === "complimentary", ai_credit_allowance: input.aiCreditAllowance,
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id" })
  ]);
  if (tenantError || subscriptionError) redirect(destination(`Tenant update failed: ${(tenantError ?? subscriptionError)?.message}`, "error"));
  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId, user_id: user.id, action: "platform.tenant.updated",
    entity_type: "tenant", entity_id: input.tenantId,
    metadata: { tenant_type: input.tenantType, platform_plan: input.planSlug, ai_credit_allowance: input.aiCreditAllowance }
  });
  redirect(destination(`${input.name} was updated.`, "success"));
}

