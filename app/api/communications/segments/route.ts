import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEligibleRecipients } from "@/lib/communications/audience";
import { recordCommunicationAudit } from "@/lib/communications/operations";

const ruleSchema = z.object({
  ruleType: z.enum([
    "membership_plan",
    "membership_status",
    "group_membership",
    "course_enrollment",
    "event_registration",
    "joined_before",
    "joined_after",
    "email_opt_in",
    "last_login"
  ]),
  operator: z.enum(["equals", "not_equals", "before", "after"]).default("equals"),
  value: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])
});
const segmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  matchType: z.enum(["and", "or"]),
  rules: z.array(ruleSchema).min(1).max(20)
});

async function authorized() {
  const context = await getActiveTenantCommunicator();
  if (!context) return null;
  const entitlements = await getTenantEntitlements(
    context.tenant.id,
    context.supabase
  );
  return entitlements.get("communication_hub") === true &&
    entitlements.get("communication_segments") === true
    ? context
    : null;
}

export async function GET() {
  const context = await authorized();
  if (!context) {
    return NextResponse.json(
      { error: "Audience segments are unavailable." },
      { status: 403 }
    );
  }
  const { data: segments, error } = await context.supabase
    .from("audience_segments")
    .select("id,name,description,match_type,status,created_at,updated_at")
    .eq("tenant_id", context.tenant.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Unable to load audience segments." },
      { status: 500 }
    );
  }
  const items = await Promise.all(
    (segments ?? []).map(async (segment) => {
      const [{ data: rules }, recipients] = await Promise.all([
        context.supabase
          .from("audience_segment_rules")
          .select("id,rule_type,operator,rule_value")
          .eq("tenant_id", context.tenant.id)
          .eq("segment_id", segment.id)
          .order("created_at"),
        resolveEligibleRecipients({
          tenantId: context.tenant.id,
          audienceType: "segments",
          audienceIds: [segment.id],
          marketing: false
        })
      ]);
      return { ...segment, rules: rules ?? [], estimated_count: recipients.length };
    })
  );
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const context = await authorized();
  if (!context) {
    return NextResponse.json(
      { error: "Audience segments are unavailable." },
      { status: 403 }
    );
  }
  const parsed = segmentSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid segment." },
      { status: 400 }
    );
  }
  const now = new Date().toISOString();
  const values = {
    tenant_id: context.tenant.id,
    name: parsed.data.name,
    description: parsed.data.description,
    match_type: parsed.data.matchType,
    status: "active",
    updated_at: now
  };
  const segmentResult = parsed.data.id
    ? await context.supabase
        .from("audience_segments")
        .update(values)
        .eq("id", parsed.data.id)
        .eq("tenant_id", context.tenant.id)
        .select("id")
        .single()
    : await context.supabase
        .from("audience_segments")
        .insert({ ...values, created_by: context.user.id })
        .select("id")
        .single();
  if (segmentResult.error || !segmentResult.data) {
    return NextResponse.json(
      { error: "Unable to save the segment." },
      { status: 400 }
    );
  }
  const segmentId = segmentResult.data.id;
  if (parsed.data.id) {
    await context.supabase
      .from("audience_segment_rules")
      .delete()
      .eq("segment_id", segmentId)
      .eq("tenant_id", context.tenant.id);
  }
  const { error: rulesError } = await context.supabase
    .from("audience_segment_rules")
    .insert(
      parsed.data.rules.map((rule) => ({
        tenant_id: context.tenant.id,
        segment_id: segmentId,
        rule_type: rule.ruleType,
        operator: rule.operator,
        rule_value: rule.value
      }))
    );
  if (rulesError) {
    if (!parsed.data.id) {
      await context.supabase
        .from("audience_segments")
        .delete()
        .eq("id", segmentId)
        .eq("tenant_id", context.tenant.id);
    }
    return NextResponse.json(
      { error: "Unable to save segment rules." },
      { status: 400 }
    );
  }
  await recordCommunicationAudit(createAdminClient(), {
    tenantId: context.tenant.id,
    actorId: context.user.id,
    actorRole: context.role,
    action: `segments.${parsed.data.id ? "updated" : "created"}`,
    resourceType: "audience_segment",
    resourceId: segmentId
  });
  return NextResponse.json({ id: segmentId });
}

export async function DELETE(request: NextRequest) {
  const context = await authorized();
  if (!context) {
    return NextResponse.json(
      { error: "Audience segments are unavailable." },
      { status: 403 }
    );
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: "A valid segment is required." },
      { status: 400 }
    );
  }
  const { error } = await context.supabase
    .from("audience_segments")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", context.tenant.id);
  if (error) {
    return NextResponse.json(
      { error: "Unable to archive the segment." },
      { status: 400 }
    );
  }
  return NextResponse.json({ archived: true });
}
