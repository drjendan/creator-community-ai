import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { isMissingEditableMembershipMetadata } from "@/lib/supabase/error";
import { withoutEditableMembershipMetadata } from "@/lib/membership-plan-compat";

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
  })
});

export async function GET() {
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  if (!["tenant_owner", "tenant_admin"].includes(context.role)) return NextResponse.json({ error: "Tenant owner or administrator access is required." }, { status: 403 });
  const { data, error } = await context.supabase.from("tenant_membership_plans").select("*").eq("tenant_id", context.tenant.id).order("sort_order").order("price_monthly");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [], tenant: context.tenant });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the membership plan fields." }, { status: 400 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  if (!["tenant_owner", "tenant_admin"].includes(context.role)) return NextResponse.json({ error: "Tenant owner or administrator access is required." }, { status: 403 });
  const input = parsed.data;
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
    status: input.status,
    sort_order: input.sortOrder,
    display_order: input.sortOrder,
    is_active: input.status === "active",
    is_editable: true,
    benefits: input.benefits,
    color: input.color,
    access_rules: input.includedContent,
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
  await context.supabase.from("audit_logs").insert({
    tenant_id: context.tenant.id, user_id: context.user.id,
    action: input.id ? "tenant.membership_plan.updated" : "tenant.membership_plan.created",
    entity_type: "tenant_membership_plan", entity_id: result.data.id,
    metadata: { name: input.name, plan_type: input.planType }
  });
  return NextResponse.json({ plan: result.data, metadataDeferred });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "A valid plan is required." }, { status: 400 });
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  if (!["tenant_owner", "tenant_admin"].includes(context.role)) return NextResponse.json({ error: "Tenant owner or administrator access is required." }, { status: 403 });
  const { count } = await context.supabase.from("member_subscriptions").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenant.id).eq("plan_id", id).in("status", ["active", "trialing"]);
  if (count) return NextResponse.json({ error: "Deactivate this plan instead; it still has active members." }, { status: 409 });
  const { error } = await context.supabase.from("tenant_membership_plans").delete().eq("tenant_id", context.tenant.id).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await context.supabase.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: "tenant.membership_plan.deleted", entity_type: "tenant_membership_plan", entity_id: id });
  return NextResponse.json({ deleted: true });
}
