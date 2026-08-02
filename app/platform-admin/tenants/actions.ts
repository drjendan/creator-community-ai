"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { databaseErrorMessage, isMissingEditableMembershipMetadata } from "@/lib/supabase/error";
import { withoutEditableMembershipMetadata } from "@/lib/membership-plan-compat";
import { featureCatalog, membershipTemplateIds, membershipTemplates, platformPlanSlugs, tenantTypes } from "@/lib/subscriptions";
import { tenantHostname, tenantOrigin, validateTenantSlug } from "@/lib/tenant-domains";
import { cookies } from "next/headers";

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
  membershipTemplate: z.enum(membershipTemplateIds),
  recommendedMembershipTemplate: z.enum(membershipTemplateIds),
  membershipTemplateOverridden: z.enum(["true", "false"]),
  aiAccessMode: z.enum(["tenant_adds_key", "configure_after_creation", "disabled"])
}).superRefine((input, context) => {
  const error = validateTenantSlug(input.slug);
  if (error) context.addIssue({ code: z.ZodIssueCode.custom, path: ["slug"], message: error });
});

export async function enterTenantWorkspace(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!z.string().uuid().safeParse(tenantId).success) redirect(destination("Choose a valid tenant workspace.", "error"));
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) redirect("/login?next=%2Fplatform-admin%2Ftenants");
  const user = actor.user;
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,status").eq("id", tenantId).maybeSingle();
  if (!tenant || tenant.status !== "active") redirect(destination("Only active tenant workspaces can be opened.", "error"));
  (await cookies()).set("upnexx-platform-tenant", tenant.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  await admin.from("audit_logs").insert({ tenant_id: tenant.id, user_id: user.id, action: "platform.tenant_workspace.entered", entity_type: "tenant", entity_id: tenant.id, metadata: { acting_role: actor.role } });
  redirect("/dashboard");
}

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
    membershipTemplate: formData.get("membershipTemplate"),
    recommendedMembershipTemplate: formData.get("recommendedMembershipTemplate"),
    membershipTemplateOverridden: formData.get("membershipTemplateOverridden"),
    aiAccessMode: formData.get("aiAccessMode")
  });

  if (!parsed.success) {
    redirect(destination("Check the tenant name, URL slug, owner email, and brand colors.", "error"));
  }

  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) {
    redirect(destination("Only a platform owner or platform administrator can create tenants.", "error"));
  }
  const user = actor.user;

  const admin = createAdminClient();
  const input = parsed.data;
  let resultMessage = "";
  let resultType: "success" | "error" = "success";
  let createdTenantId: string | null = null;
  let membershipMetadataDeferred = false;

  try {
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: input.name,
        slug: input.slug,
        status: "pending",
        tenant_type: input.tenantType,
        updated_at: new Date().toISOString()
      })
      .select("id,name,slug")
      .single();

    if (tenantError) throw tenantError;
    createdTenantId = tenant.id;

    const tenantHost = tenantHostname(tenant.slug);
    const [{ error: domainError }, { error: stripeStateError }] = await Promise.all([
      admin.from("tenant_domains").insert({
        tenant_id: tenant.id, hostname: tenantHost, is_primary: true,
        status: "pending", domain_type: "upnexx_subdomain", ssl_status: "pending"
      }),
      admin.from("tenant_stripe_accounts").insert({ tenant_id: tenant.id, status: "not_connected" })
    ]);
    if (domainError) throw domainError;
    if (stripeStateError) throw stripeStateError;

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
      const appUrl = process.env.TENANT_SUBDOMAINS_ENABLED === "true"
        ? tenantOrigin(tenant.slug)
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

    const ownerActivatedAt = owner.email_confirmed_at || owner.last_sign_in_at || null;
    const invitationTimestamp = new Date().toISOString();
    const { error: ownerTrackingError } = await admin.from("tenants").update({
      status: ownerActivatedAt ? "active" : "pending",
      owner_invited_at: invitationSent ? invitationTimestamp : null,
      owner_invitation_last_sent_at: invitationSent ? invitationTimestamp : null,
      owner_invitation_send_count: invitationSent ? 1 : 0,
      owner_activated_at: ownerActivatedAt,
      updated_at: invitationTimestamp
    }).eq("id", tenant.id);
    if (ownerTrackingError) throw ownerTrackingError;

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
      {
        tenant_id: tenant.id,
        enabled: input.subscriptionStatus === "trialing" && input.trialDays > 0
          ? true
          : input.aiAccessMode !== "disabled",
        updated_at: new Date().toISOString()
      },
      { onConflict: "tenant_id" }
    );
    if (aiSettingsError) throw aiSettingsError;

    const { data: plan, error: planError } = await admin.from("platform_plans").select("id,name,ai_credit_allowance").eq("slug", input.planSlug).single();
    if (planError || !plan) throw planError ?? new Error("The selected platform plan is unavailable.");
    const now = new Date();
    const trialEndsAt = input.trialDays > 0 ? new Date(now.getTime() + input.trialDays * 86400000).toISOString() : null;
    const isTrial = input.subscriptionStatus === "trialing" && input.trialDays > 0;
    const complimentary = input.planSlug === "complimentary" || input.subscriptionStatus === "complimentary";
    const { error: subscriptionError } = await admin.from("tenant_subscriptions").upsert({
      tenant_id: tenant.id,
      plan_id: plan.id,
      status: complimentary ? "active" : input.subscriptionStatus,
      billing_frequency: complimentary ? "none" : input.billingFrequency,
      trial_starts_at: input.trialDays ? now.toISOString() : null,
      trial_ends_at: trialEndsAt,
      trial_days_granted: isTrial ? input.trialDays : null,
      trial_status: isTrial ? "active" : null,
      trial_plan_name: isTrial ? (input.planSlug === "trial" ? "Professional" : plan.name) : "Professional",
      trial_changed_by: user.id,
      trial_changed_role: actor.role,
      starts_at: now.toISOString(),
      custom_price: input.customPrice === "" ? null : input.customPrice,
      complimentary,
      ai_credit_allowance: input.aiCreditAllowance || plan.ai_credit_allowance,
      current_ai_usage: 0,
      updated_at: now.toISOString()
    }, { onConflict: "tenant_id" });
    if (subscriptionError) throw subscriptionError;

    const allowedFeatures = new Set(featureCatalog.map((feature) => feature.key));
    const selectedFeatures = new Set(input.features.filter((key) => allowedFeatures.has(key as never)));
    const entitlements = featureCatalog.map(({ key: featureKey }) => ({
        tenant_id: tenant.id,
        feature_key: featureKey,
        enabled: isTrial || (selectedFeatures.has(featureKey) && (input.aiAccessMode !== "disabled" || featureKey !== "creator_ai_studio")),
        source: isTrial ? "plan" : "override",
        updated_at: now.toISOString()
      }));
    if (input.aiAccessMode === "disabled" && !isTrial) {
      entitlements.push({
        tenant_id: tenant.id,
        feature_key: "creator_ai_studio",
        enabled: false,
        source: "override",
        updated_at: now.toISOString()
      });
    }
    if (entitlements.length) {
      const { error: entitlementError } = await admin.from("tenant_feature_entitlements").upsert(entitlements, { onConflict: "tenant_id,feature_key" });
      if (entitlementError) throw entitlementError;
    }

    if (selectedFeatures.has("communication_hub")) {
      const starterTemplates = [
        ["Welcome", "welcome", `Welcome to ${tenant.name}`, `Welcome to ${tenant.name}. Visit your member home to get started.`],
        ["Announcement", "announcement", "An update from our organization", "We have an important update to share with you."],
        ["Newsletter", "newsletter", "Your organization newsletter", "Here are the latest updates from our organization."],
        ["Event Invitation", "event_invitation", "You are invited", "You are invited to join our upcoming event."],
        ["Event Reminder", "event_reminder", "Event reminder", "This is a reminder about your upcoming event."],
        ["New Content", "new_content", "New content is available", "New member content is now available."],
        ["Course Enrollment", "course_enrollment", "Course enrollment confirmed", "Your course enrollment is confirmed."],
        ["Course Reminder", "course_reminder", "Continue your course", "Return to your member home to continue learning."],
        ["Membership Renewal", "membership_renewal", "Membership renewal reminder", "Review your membership renewal details in your member account."],
        ["General Update", "general_update", "An update from our organization", "We have an update to share with you."]
      ].map(([name, category, subject, body]) => ({
        tenant_id: tenant.id,
        name,
        description: `Editable ${name.toLowerCase()} email template`,
        category,
        subject,
        preview_text: "",
        content_json: [{ type: "paragraph", text: body }],
        html_content: `<p>${body}</p>`,
        plain_text_content: body,
        is_default: name === "Welcome",
        is_active: true,
        created_from_system_template: true,
        created_by: user.id,
        updated_by: user.id
      }));
      const { data: templates, error: templateSeedError } = await admin.from("email_templates").insert(starterTemplates).select("id,category");
      if (templateSeedError) throw templateSeedError;
      const welcomeTemplate = templates?.find((item) => item.category === "welcome");
      const { data: automation, error: automationError } = await admin.from("communication_automations").insert({
        tenant_id: tenant.id,
        name: "Welcome new members",
        trigger_type: "member_joined",
        status: "inactive",
        is_system_default: true,
        created_by: user.id
      }).select("id").single();
      if (automationError) throw automationError;
      const { error: stepError } = await admin.from("communication_automation_steps").insert([
        { tenant_id: tenant.id, automation_id: automation.id, position: 0, action_type: "send_email", configuration: { template_id: welcomeTemplate?.id, button_label: "Visit Your Member Home", button_destination: `/demo/${tenant.slug}/welcome` } },
        { tenant_id: tenant.id, automation_id: automation.id, position: 1, action_type: "create_message", configuration: { subject: `Welcome to ${tenant.name}` } }
      ]);
      if (stepError) throw stepError;
    }

    const template = membershipTemplates[input.membershipTemplate];
    if (template.plans.length) {
      const planRows = template.plans.map((membershipPlan) => {
        const requiresPayments = membershipPlan.planType === "paid";
        return {
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
        status: requiresPayments ? "inactive" : "active",
        sort_order: membershipPlan.sortOrder,
        display_order: membershipPlan.sortOrder,
        is_active: !requiresPayments,
        payment_setup_required: requiresPayments,
        is_editable: true,
        created_from_template: true,
        template_key: input.membershipTemplate,
        benefits: [],
        color: null,
        access_rules: {}
      };
      });
      const { error: membershipPlansError } = await admin.from("tenant_membership_plans").insert(planRows);
      if (membershipPlansError && isMissingEditableMembershipMetadata(membershipPlansError)) {
        membershipMetadataDeferred = true;
        const legacyPlanRows = planRows.map(withoutEditableMembershipMetadata);
        const { error: legacyMembershipPlansError } = await admin.from("tenant_membership_plans").insert(legacyPlanRows);
        if (legacyMembershipPlansError) throw legacyMembershipPlansError;
      } else if (membershipPlansError) {
        throw membershipPlansError;
      }
    }
    const { error: membershipSetupError } = await admin.from("feature_flags").upsert(
      {
        tenant_id: tenant.id,
        key: "membership_setup_status",
        enabled: template.plans.length > 0,
        configuration: {
          status: template.plans.length > 0 ? "starter_plans_created" : "not_started",
          template_key: input.membershipTemplate
        },
        updated_at: now.toISOString()
      },
      { onConflict: "tenant_id,key" }
    );
    if (membershipSetupError) throw membershipSetupError;

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

    const { error: credentialPolicyError } = await admin.from("feature_flags").upsert(
      {
        tenant_id: tenant.id,
        key: "tenant_can_manage_ai_credentials",
        enabled: input.aiAccessMode !== "disabled",
        configuration: {},
        updated_at: now.toISOString()
      },
      { onConflict: "tenant_id,key" }
    );
    if (credentialPolicyError) throw credentialPolicyError;

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
        recommended_membership_template: input.recommendedMembershipTemplate,
        membership_template_recommendation_accepted: input.membershipTemplate === input.recommendedMembershipTemplate,
        membership_template_overridden: input.membershipTemplateOverridden === "true",
        ai_credit_allowance: input.aiCreditAllowance || plan.ai_credit_allowance,
        features: input.features,
        invitation_sent: invitationSent,
        ai_access_mode: input.aiAccessMode,
        tenant_url: tenantOrigin(tenant.slug),
        stripe_status: "not_connected"
      }
    });

    resultMessage = invitationSent
      ? `${input.name} was created at ${tenantOrigin(input.slug)} and an owner invitation was sent to ${input.ownerEmail}. Stripe can be connected later.`
      : `${input.name} was created at ${tenantOrigin(input.slug)} and ${input.ownerEmail} was assigned as its owner. Stripe can be connected later.`;
    if (membershipMetadataDeferred) {
      resultMessage += " Starter memberships were created with legacy fields; apply database migration 0008 to enable template metadata, colors, and benefits.";
    }
  } catch (error) {
    const detail = databaseErrorMessage(error);
    if (createdTenantId) {
      await admin.from("tenants").delete().eq("id", createdTenantId);
      createdTenantId = null;
    }
    const keyProblem = /not_admin|user not allowed|row-level security|permission denied/i.test(detail);
    resultMessage = keyProblem
      ? "The server admin key is not authorized. Add the Supabase secret/service-role key to .env.local and restart UpNexx."
      : `Tenant setup failed: ${detail}`;
    resultType = "error";
  }

  if (resultType === "success" && createdTenantId && parsed.data.aiAccessMode === "configure_after_creation") {
    redirect(`/platform-admin/tenants/${createdTenantId}?setupAI=1`);
  }
  redirect(destination(resultMessage, resultType));
}

const updateSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  tenantType: z.enum(tenantTypes),
  planSlug: z.enum(platformPlanSlugs),
  subscriptionStatus: z.enum(["trialing", "active", "past_due", "canceled", "expired_trial"]),
  billingFrequency: z.enum(["monthly", "annual", "custom", "none"]),
  aiCreditAllowance: z.coerce.number().int().min(0),
  customPrice: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  tenantCanManageAiCredentials: z.boolean(),
  features: z.array(z.string())
});

export async function updateTenant(formData: FormData) {
  const parsed = updateSchema.safeParse({
    ...Object.fromEntries(formData),
    tenantCanManageAiCredentials: formData.get("tenantCanManageAiCredentials") === "on",
    features: formData.getAll("features").map(String)
  });
  if (!parsed.success) redirect(destination("Check the tenant subscription fields.", "error"));
  const actor = await getPlatformAdministrator("platform.tenants.manage");
  if (!actor) redirect(destination("Platform administrator access is required.", "error"));
  const user = actor.user;
  const admin = createAdminClient();
  const input = parsed.data;
  const { data: previousCredentialPolicy } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("tenant_id", input.tenantId)
    .eq("key", "tenant_can_manage_ai_credentials")
    .maybeSingle();
  const { data: plan, error: planError } = await admin.from("platform_plans").select("id").eq("slug", input.planSlug).single();
  if (planError || !plan) redirect(destination("The selected platform plan is unavailable.", "error"));
  const [{ error: tenantError }, { error: subscriptionError }, { error: aiCredentialPolicyError }] = await Promise.all([
    admin.from("tenants").update({ name: input.name, tenant_type: input.tenantType, updated_at: new Date().toISOString() }).eq("id", input.tenantId),
    admin.from("tenant_subscriptions").upsert({
      tenant_id: input.tenantId, plan_id: plan.id, status: input.subscriptionStatus,
      billing_frequency: input.billingFrequency, custom_price: input.customPrice === "" ? null : input.customPrice,
      complimentary: input.planSlug === "complimentary", ai_credit_allowance: input.aiCreditAllowance,
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id" }),
    admin.from("feature_flags").upsert({
      tenant_id: input.tenantId,
      key: "tenant_can_manage_ai_credentials",
      enabled: input.tenantCanManageAiCredentials,
      configuration: {},
      updated_at: new Date().toISOString()
    }, { onConflict: "tenant_id,key" })
  ]);
  if (tenantError || subscriptionError || aiCredentialPolicyError) redirect(destination(`Tenant update failed: ${(tenantError ?? subscriptionError ?? aiCredentialPolicyError)?.message}`, "error"));
  const selectedFeatures = new Set(input.features);
  const { error: entitlementError } = await admin.from("tenant_feature_entitlements").upsert(featureCatalog.map((feature) => ({
    tenant_id: input.tenantId,
    feature_key: feature.key,
    enabled: selectedFeatures.has(feature.key),
    source: "override",
    updated_at: new Date().toISOString()
  })), { onConflict: "tenant_id,feature_key" });
  if (entitlementError) redirect(destination(`Tenant entitlement update failed: ${entitlementError.message}`, "error"));
  await admin.from("audit_logs").insert({
    tenant_id: input.tenantId, user_id: user.id, action: "platform.tenant.updated",
    entity_type: "tenant", entity_id: input.tenantId,
    metadata: { tenant_type: input.tenantType, platform_plan: input.planSlug, ai_credit_allowance: input.aiCreditAllowance, tenant_can_manage_ai_credentials: input.tenantCanManageAiCredentials }
  });
  if (previousCredentialPolicy?.enabled !== input.tenantCanManageAiCredentials) {
    await admin.from("audit_logs").insert({
      tenant_id: input.tenantId,
      user_id: user.id,
      action: "tenant.ai_credential_management_permission.changed",
      entity_type: "feature_flag",
      metadata: {
        acting_role: actor.role,
        enabled: input.tenantCanManageAiCredentials
      }
    });
  }
  redirect(destination(`${input.name} was updated.`, "success"));
}

