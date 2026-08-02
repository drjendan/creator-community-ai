import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { enforceRateLimit, rateLimitError } from "@/lib/rate-limit";

const schema = z.object({
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(80)
});

export async function GET() {
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "An organization workspace is required." }, { status: 403 });
  const { data, error } = await context.supabase
    .from("support_requests")
    .select("id,subject,body,status,created_at,updated_at")
    .eq("tenant_id", context.tenant.id)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load support requests." }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "An organization workspace is required." }, { status: 403 });
  const limit = await enforceRateLimit({ request, scope: "tenant.support.create", limit: 10, windowSeconds: 3600, tenantId: context.tenant.id, userId: context.user.id }); if (!limit.allowed) { const failure = rateLimitError(limit); return NextResponse.json({ error: failure.error }, { status: failure.status, headers: failure.headers }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the subject and request details." }, { status: 400 });
  const { data, error } = await context.supabase.from("support_requests").insert({
    tenant_id: context.tenant.id,
    user_id: context.user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    status: "open",
    metadata: { category: parsed.data.category }
  }).select("id,subject,body,status,created_at").single();
  if (error) return NextResponse.json({ error: "Unable to submit the support request." }, { status: 500 });
  await context.supabase.from("audit_logs").insert({
    tenant_id: context.tenant.id,
    user_id: context.user.id,
    action: "tenant.support_request.created",
    entity_type: "support_request",
    entity_id: data.id,
    metadata: { category: parsed.data.category }
  });
  return NextResponse.json({ request: data }, { status: 201 });
}
