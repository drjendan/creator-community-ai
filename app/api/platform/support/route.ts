import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logError, logInfo, logWarning } from "@/lib/logging";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceRateLimit, rateLimitError } from "@/lib/rate-limit";

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  note: z.string().trim().max(500).optional().default("")
});

export async function PATCH(request: NextRequest) {
  const access = await getPlatformAdministrator("platform.support.manage");
  if (!access) return NextResponse.json({ error: "Platform support management permission is required." }, { status: 403 });
  const limit = await enforceRateLimit({ request, scope: "platform.support.update", limit: 60, windowSeconds: 3600, userId: access.user.id }); if (!limit.allowed) { const failure = rateLimitError(limit); return NextResponse.json({ error: failure.error }, { status: failure.status, headers: failure.headers }); }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a valid support status." }, { status: 400 });

  const admin = createAdminClient();
  const { data: current, error: readError } = await admin
    .from("support_requests")
    .select("id,tenant_id,status,metadata")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (readError) {
    logError("platform.support.read_failed", readError, { requestId: parsed.data.id, actorId: access.user.id });
    return NextResponse.json({ error: "Unable to load the support request." }, { status: 500 });
  }
  if (!current) return NextResponse.json({ error: "Support request not found." }, { status: 404 });

  const changedAt = new Date().toISOString();
  const metadata = {
    ...((current.metadata as Record<string, unknown> | null) ?? {}),
    ...(parsed.data.note ? { platform_note: parsed.data.note } : {}),
    platform_updated_by: access.user.id,
    platform_updated_at: changedAt
  };
  const { data: updated, error: updateError } = await admin
    .from("support_requests")
    .update({ status: parsed.data.status, metadata, updated_at: changedAt })
    .eq("id", current.id)
    .select("id,status,updated_at")
    .single();
  if (updateError) {
    logError("platform.support.update_failed", updateError, { requestId: current.id, actorId: access.user.id });
    return NextResponse.json({ error: "Unable to update the support request." }, { status: 500 });
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    tenant_id: current.tenant_id,
    user_id: access.user.id,
    action: "platform.support_request.status_changed",
    entity_type: "support_request",
    entity_id: current.id,
    metadata: { before_status: current.status, after_status: parsed.data.status, note: parsed.data.note || null }
  });
  if (auditError) {
    logWarning("platform.support.audit_failed", { requestId: current.id, actorId: access.user.id });
    return NextResponse.json({ request: updated, warning: "Status changed, but the audit event could not be recorded." });
  }
  logInfo("platform.support.status_changed", { requestId: current.id, actorId: access.user.id, status: parsed.data.status });
  return NextResponse.json({ request: updated });
}
