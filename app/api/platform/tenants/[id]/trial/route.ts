import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { standardTrialFeatureKeys } from "@/lib/trials";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("extend"),
    days: z.number().int().min(1).max(365),
    reason: z.string().trim().min(5).max(500)
  }),
  z.object({
    action: z.literal("end"),
    reason: z.string().trim().min(5).max(500)
  }),
  z.object({
    action: z.literal("convert"),
    planSlug: z.string().trim().min(2).max(80),
    billingFrequency: z.enum(["monthly", "annual", "custom", "none"]),
    reason: z.string().trim().min(5).max(500)
  })
]);

async function platformActor() {
  return getPlatformAdministrator("platform.billing.manage");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await platformActor();
  if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid tenant is required." }, { status: 400 });
  const admin = createAdminClient();
  const [{ data: subscription }, { data: history }] = await Promise.all([
    admin
      .from("tenant_subscriptions")
      .select("*,platform_plans(name,slug)")
      .eq("tenant_id", id)
      .maybeSingle(),
    admin
      .from("trial_history")
      .select("*")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false })
  ]);
  return NextResponse.json({ subscription, history: history ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await platformActor();
  if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid tenant is required." }, { status: 400 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the trial action." }, { status: 400 });

  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from("tenant_subscriptions")
    .select("id,status,trial_status,trial_starts_at,trial_ends_at,trial_days_granted")
    .eq("tenant_id", id)
    .maybeSingle();
  if (!subscription) return NextResponse.json({ error: "This tenant does not have a platform subscription." }, { status: 404 });
  if (!subscription.trial_starts_at && parsed.data.action !== "convert") {
    return NextResponse.json({ error: "This subscription is not a trial." }, { status: 409 });
  }

  const now = new Date();
  const shared = {
    trial_changed_by: actor.user.id,
    trial_changed_role: actor.role,
    updated_at: now.toISOString()
  };

  if (parsed.data.action === "extend") {
    if (subscription.trial_status === "converted") {
      return NextResponse.json({ error: "A converted trial cannot be extended." }, { status: 409 });
    }
    const currentEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : now;
    const base = currentEnd.getTime() > now.getTime() ? currentEnd : now;
    const endsAt = new Date(base.getTime() + parsed.data.days * 86400000).toISOString();
    const { error } = await admin.from("tenant_subscriptions").update({
      ...shared,
      status: "trialing",
      trial_status: "extended",
      trial_ends_at: endsAt,
      current_period_end: endsAt,
      trial_days_granted: Number(subscription.trial_days_granted ?? 0) + parsed.data.days,
      trial_extended_at: now.toISOString(),
      trial_extended_by: actor.user.id,
      trial_extension_reason: parsed.data.reason,
      trial_ended_at: null
    }).eq("id", subscription.id);
    if (error) return NextResponse.json({ error: "Unable to extend the trial." }, { status: 500 });
    await admin.from("tenant_feature_entitlements").upsert(
      standardTrialFeatureKeys.map((featureKey) => ({
        tenant_id: id,
        feature_key: featureKey,
        enabled: true,
        source: "plan",
        updated_at: now.toISOString()
      })),
      { onConflict: "tenant_id,feature_key" }
    );
    return NextResponse.json({ updated: true, message: `Trial extended by ${parsed.data.days} days.` });
  }

  if (parsed.data.action === "end") {
    if (["converted", "cancelled", "expired"].includes(String(subscription.trial_status))) {
      return NextResponse.json({ error: "This trial has already ended." }, { status: 409 });
    }
    const { error } = await admin.from("tenant_subscriptions").update({
      ...shared,
      status: "expired_trial",
      trial_status: "cancelled",
      trial_ends_at: now.toISOString(),
      current_period_end: now.toISOString(),
      trial_ended_at: now.toISOString(),
      trial_extension_reason: parsed.data.reason
    }).eq("id", subscription.id);
    if (error) return NextResponse.json({ error: "Unable to end the trial." }, { status: 500 });
    return NextResponse.json({ updated: true, message: "Trial ended." });
  }

  const { data: plan } = await admin
    .from("platform_plans")
    .select("id,name,slug,ai_credit_allowance")
    .eq("slug", parsed.data.planSlug)
    .eq("status", "active")
    .maybeSingle();
  if (!plan || ["trial", "complimentary"].includes(plan.slug)) return NextResponse.json({ error: "Choose an active paid or contracted plan." }, { status: 400 });
  const { error } = await admin.from("tenant_subscriptions").update({
    ...shared,
    plan_id: plan.id,
    status: "active",
    trial_status: "converted",
    trial_converted_at: now.toISOString(),
    starts_at: now.toISOString(),
    billing_frequency: parsed.data.billingFrequency,
    ai_credit_allowance: plan.ai_credit_allowance,
    trial_extension_reason: parsed.data.reason
  }).eq("id", subscription.id);
  if (error) return NextResponse.json({ error: "Unable to convert the trial." }, { status: 500 });
  return NextResponse.json({ updated: true, message: `Trial converted to ${plan.name}.` });
}
