import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { isMissingEditableMembershipMetadata } from "@/lib/supabase/error";
import { withoutEditableMembershipMetadata } from "@/lib/membership-plan-compat";
import { canAcceptPayments } from "@/lib/stripe-connect";
import { syncConnectedMembershipPrices } from "@/lib/stripe-billing";
import { paymentFeatureFlags } from "@/lib/community-settings";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).default(""),
  planType: z.enum(["free", "paid"]),
  monthlyPrice: z.coerce.number().min(0),
  annualPrice: z.coerce.number().min(0),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  trialDays: z.coerce.number().int().min(0).max(365),
  communityAccess: z.boolean(),
  aiAccess: z.boolean(),
  aiMonthlyAllowance: z.coerce.number().int().min(0),
  memberLimit: z.union([z.coerce.number().int().positive(), z.null()]),
  visibility: z.enum(["public", "private"]),
  status: z.enum(["active", "inactive"]),
  sortOrder: z.coerce.number().int().min(0),
  benefits: z.array(z.string().trim().min(1).max(200)).max(30),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  includedContent: z.object({
    podcasts: z.boolean(), courses: z.boolean(), resources: z.boolean(), events: z.boolean()
  }),
  billingInterval:z.enum(["monthly","annual","one_time","none"]), enrollmentType:z.enum(["open","inquiry","invite_only"]),
  externalPurchaseUrl:z.string().url().or(z.literal("")),websiteShopUrl:z.string().url().or(z.literal("")),externalBookingUrl:z.string().url().or(z.literal("")),contactForPurchase:z.string().trim().max(320)
}).superRefine((value, context) => {
  if (value.planType === "paid" && value.monthlyPrice <= 0 && value.annualPrice <= 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Paid plans require a monthly or annual price." });
  }
});

export async function GET() {
  const context = await getActiveTenantWithPermission("tenant.memberships.manage");
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const { data, error } = await context.supabase.from("tenant_membership_plans").select("*").eq("tenant_id", context.tenant.id).order("sort_order").order("price_monthly");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: stripe } = await context.supabase.from("tenant_stripe_accounts").select("status,charges_enabled,card_payments_status,platform_fee_active").eq("tenant_id", context.tenant.id).maybeSingle();
  return NextResponse.json({ plans: data ?? [], tenant: context.tenant, payments: { status: stripe?.status ?? "not_connected", enabled: stripe ? canAcceptPayments(stripe) : false } });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the membership plan fields." }, { status: 400 });
  const context = await getActiveTenantWithPermission("tenant.memberships.manage");
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const input = parsed.data;
  const [{ data: stripe }, { data: currentPlan }] = await Promise.all([
    context.supabase.from("tenant_stripe_accounts").select("stripe_account_id,charges_enabled,card_payments_status,platform_fee_active").eq("tenant_id", context.tenant.id).maybeSingle(),
    input.id ? context.supabase.from("tenant_membership_plans").select("price_monthly,price_annual,currency,stripe_product_id,stripe_monthly_price_id,stripe_annual_price_id").eq("tenant_id", context.tenant.id).eq("id", input.id).maybeSingle() : Promise.resolve({ data: null })
  ]);
  const flags = paymentFeatureFlags();
  const paymentSetupRequired = input.planType === "paid" && (!flags.stripeConnect || !flags.paidMemberships || !flags.liveCheckout || !canAcceptPayments(stripe ?? {}));
  const effectiveStatus = input.planType === "paid" ? "inactive" : input.status;
  const values = {
    tenant_id: context.tenant.id,
    name: input.name,
    description: input.description,
    plan_type: input.planType,
    price_monthly: input.planType === "free" ? 0 : input.monthlyPrice,
    price_annual: input.planType === "free" ? 0 : input.annualPrice,
    currency: input.currency,
    trial_days: input.trialDays,
    community_access: input.communityAccess,
    ai_access: input.aiAccess,
    ai_monthly_allowance: input.aiAccess ? input.aiMonthlyAllowance : 0,
    member_limit: input.memberLimit,
    visibility: input.visibility,
    status: effectiveStatus,
    sort_order: input.sortOrder,
    display_order: input.sortOrder,
    is_active: effectiveStatus === "active",
    payment_setup_required: paymentSetupRequired,
    is_editable: true,
    benefits: input.benefits,
    color: input.color,
    access_rules: input.includedContent,
    billing_interval:input.billingInterval,enrollment_type:input.enrollmentType,external_purchase_url:input.externalPurchaseUrl||null,website_shop_url:input.websiteShopUrl||null,external_booking_url:input.externalBookingUrl||null,contact_for_purchase:input.contactForPurchase||null,
    updated_at: new Date().toISOString()
  };
  const query = context.supabase.from("tenant_membership_plans");
  let result = input.id
    ? await query.update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).select("*").single()
    : await query.insert({ ...values, created_from_template: false, template_key: null, slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 8)}` }).select("*").single();
  let metadataDeferred = false;
  if (result.error && isMissingEditableMembershipMetadata(result.error)) {
    metadataDeferred = true;
    const legacyValues = withoutEditableMembershipMetadata(values);
    result = input.id
      ? await query.update(legacyValues).eq("id", input.id).eq("tenant_id", context.tenant.id).select("*").single()
      : await query.insert({ ...legacyValues, slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 8)}` }).select("*").single();
  }
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  let billingWarning: string | null = null;
  let finalPlan = result.data;
  let finalPaymentSetupRequired = paymentSetupRequired;
  if (input.planType === "paid" && flags.stripeConnect && flags.paidMemberships && flags.liveCheckout && !paymentSetupRequired && stripe?.stripe_account_id) {
    try {
      const monthlyChanged = !currentPlan?.stripe_monthly_price_id || Number(currentPlan.price_monthly) !== input.monthlyPrice || currentPlan.currency !== input.currency;
      const annualChanged = !currentPlan?.stripe_annual_price_id || Number(currentPlan.price_annual) !== input.annualPrice || currentPlan.currency !== input.currency;
      const synced = await syncConnectedMembershipPrices({
        accountId: stripe.stripe_account_id,
        tenantId: context.tenant.id,
        planId: result.data.id,
        name: input.name,
        description: input.description,
        currency: input.currency,
        monthlyAmount: input.monthlyPrice,
        annualAmount: input.annualPrice,
        existingProductId: currentPlan?.stripe_product_id,
        createMonthlyPrice: input.monthlyPrice > 0 && monthlyChanged,
        createAnnualPrice: input.annualPrice > 0 && annualChanged
      });
      const { data: syncedPlan, error: syncSaveError } = await context.supabase.from("tenant_membership_plans").update({
        stripe_product_id: synced.productId,
        stripe_monthly_price_id: synced.monthlyPriceId ?? currentPlan?.stripe_monthly_price_id ?? null,
        stripe_annual_price_id: synced.annualPriceId ?? currentPlan?.stripe_annual_price_id ?? null,
        stripe_prices_synced_at: new Date().toISOString(),
        payment_setup_required: false,
        status: input.status,
        is_active: input.status === "active"
      }).eq("tenant_id", context.tenant.id).eq("id", result.data.id).select("*").single();
      if (syncSaveError) throw syncSaveError;
      finalPlan = syncedPlan;
      finalPaymentSetupRequired = false;
    } catch (error) {
      billingWarning = error instanceof Error ? error.message : "Stripe price synchronization failed.";
      finalPaymentSetupRequired = true;
      await context.supabase.from("tenant_membership_plans").update({ payment_setup_required: true, status: "inactive", is_active: false }).eq("tenant_id", context.tenant.id).eq("id", result.data.id);
    }
  }
  await context.supabase.from("audit_logs").insert({
    tenant_id: context.tenant.id, user_id: context.user.id,
    action: input.id ? "tenant.membership_plan.updated" : "tenant.membership_plan.created",
    entity_type: "tenant_membership_plan", entity_id: result.data.id,
    metadata: { name: input.name, plan_type: input.planType }
  });
  return NextResponse.json({ plan: finalPlan, metadataDeferred, paymentSetupRequired: finalPaymentSetupRequired, billingWarning });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid plan is required." }, { status: 400 });
  const context = await getActiveTenantWithPermission("tenant.memberships.manage");
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const { count } = await context.supabase.from("member_subscriptions").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenant.id).eq("plan_id", id).in("status", ["active", "trialing"]);
  if (count) return NextResponse.json({ error: "Deactivate this plan instead; it still has active members." }, { status: 409 });
  const { error } = await context.supabase.from("tenant_membership_plans").delete().eq("tenant_id", context.tenant.id).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await context.supabase.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: "tenant.membership_plan.deleted", entity_type: "tenant_membership_plan", entity_id: id });
  return NextResponse.json({ deleted: true });
}
