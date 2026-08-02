import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnvironmentReport } from "@/lib/env";
import { getPlatformAccess, getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";

const optionalPositiveInteger = z.number().int().positive().nullable();
const settingsSchema = z.object({
  action: z.literal("settings"), incidentContactName: z.string().trim().max(200),
  incidentContactEmail: z.union([z.literal(""), z.string().email()]), statusPageUrl: z.union([z.literal(""), z.string().url()]),
  uptimeMonitorName: z.string().trim().max(200), backupOwnerName: z.string().trim().max(200), recoveryOwnerName: z.string().trim().max(200),
  approvedRpoMinutes: optionalPositiveInteger, approvedRtoMinutes: optionalPositiveInteger
});
const checkSchema = z.object({ action: z.literal("check"), id: z.string().uuid(), status: z.enum(["pending", "passed", "failed", "waived"]), evidenceReference: z.string().trim().max(1000), notes: z.string().trim().max(5000) }).superRefine((value, context) => { if (value.status !== "pending" && !value.evidenceReference) context.addIssue({ code: "custom", message: "A non-pending check requires an evidence reference." }); if (value.status === "waived" && value.notes.length < 10) context.addIssue({ code: "custom", message: "A waiver requires explanatory notes." }); });
const recoverySchema = z.object({ action: z.literal("recovery"), verificationType: z.enum(["database_backup", "storage_backup", "database_restore", "storage_restore"]), status: z.enum(["passed", "failed", "partial"]), verifiedAt: z.string().datetime(), evidenceReference: z.string().trim().max(1000), notes: z.string().trim().max(5000), measuredRecoveryMinutes: z.number().int().nonnegative().nullable(), recoveryPointAgeMinutes: z.number().int().nonnegative().nullable() }).superRefine((value, context) => { if (value.status === "passed" && !value.evidenceReference) context.addIssue({ code: "custom", message: "A passed recovery verification requires an evidence reference." }); });
const retrySchema = z.object({ action: z.literal("retry_notification"), id: z.string().uuid() });
const schema = z.union([settingsSchema, checkSchema, recoverySchema, retrySchema]);

export async function GET() {
  const access = await getPlatformAccess();
  if (!access?.permissions.has("platform.audit.view")) return NextResponse.json({ error: "Platform audit permission is required." }, { status: 403 });
  const admin = createAdminClient();
  const [settings, checks, recovery, database, storage, notifications] = await Promise.all([
    admin.from("platform_operational_settings").select("*").eq("singleton", true).maybeSingle(),
    admin.from("production_readiness_checks").select("*").order("category").order("label"),
    admin.from("recovery_verifications").select("*").order("verified_at", { ascending: false }).limit(100),
    admin.from("tenants").select("id", { head: true, count: "exact" }).limit(1),
    admin.storage.listBuckets(),
    admin.from("transactional_notification_deliveries").select("id,tenant_id,category,recipient_hint,status,attempts,max_attempts,next_attempt_at,provider_message_id,last_error,accepted_at,created_at,updated_at").order("created_at", { ascending: false }).limit(100)
  ]);
  const migrationError = settings.error || checks.error || recovery.error || notifications.error;
  if (migrationError) return NextResponse.json({ error: /schema cache|does not exist/i.test(migrationError.message) ? "Operational readiness migration 0035 is required." : "Unable to load operational readiness evidence." }, { status: 500 });
  const environment = getEnvironmentReport();
  return NextResponse.json({
    settings: settings.data, checks: checks.data ?? [], recoveryVerifications: recovery.data ?? [], notificationDeliveries: notifications.data ?? [],
    diagnostics: { configuration: environment.valid ? "passed" : "failed", database: database.error ? "failed" : "passed", storage: storage.error ? "failed" : "passed", environment: environment.environment, missingConfiguration: environment.missing },
    canManage: access.permissions.has("platform.operations.manage")
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the operational evidence." }, { status: 400 });
  const access = await getPlatformAdministrator("platform.operations.manage");
  if (!access) return NextResponse.json({ error: "Platform operations management permission is required." }, { status: 403 });
  const admin = createAdminClient(); const input = parsed.data; const now = new Date().toISOString();
  let entityType = "platform_operational_settings"; let entityId: string | undefined; let auditAction = "platform.operations.settings_updated"; let error: { message: string } | null = null;
  if (input.action === "settings") {
    ({ error } = await admin.from("platform_operational_settings").update({ incident_contact_name: input.incidentContactName, incident_contact_email: input.incidentContactEmail, status_page_url: input.statusPageUrl, uptime_monitor_name: input.uptimeMonitorName, backup_owner_name: input.backupOwnerName, recovery_owner_name: input.recoveryOwnerName, approved_rpo_minutes: input.approvedRpoMinutes, approved_rto_minutes: input.approvedRtoMinutes, updated_by: access.user.id, updated_at: now }).eq("singleton", true));
  } else if (input.action === "check") {
    entityType = "production_readiness_check"; entityId = input.id; auditAction = `platform.readiness_check.${input.status}`;
    ({ error } = await admin.from("production_readiness_checks").update({ status: input.status, evidence_reference: input.evidenceReference, notes: input.notes, verified_by: input.status === "pending" ? null : access.user.id, verified_at: input.status === "pending" ? null : now, updated_at: now }).eq("id", input.id));
  } else if (input.action === "recovery") {
    entityType = "recovery_verification"; auditAction = `platform.recovery.${input.status}`;
    const result = await admin.from("recovery_verifications").insert({ verification_type: input.verificationType, environment: "production", status: input.status, verified_at: input.verifiedAt, evidence_reference: input.evidenceReference, notes: input.notes, measured_recovery_minutes: input.measuredRecoveryMinutes, recovery_point_age_minutes: input.recoveryPointAgeMinutes, performed_by: access.user.id }).select("id").single(); error = result.error; entityId = result.data?.id;
  } else {
    entityType = "transactional_notification_delivery"; entityId = input.id; auditAction = "platform.notification.retry_requested";
    const result = await admin.rpc("retry_transactional_notification_delivery", { delivery_id: input.id }); error = result.error; if (!error && !result.data) return NextResponse.json({ error: "Only failed notification deliveries can be retried." }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "Unable to save the operational evidence." }, { status: 500 });
  await admin.from("audit_logs").insert({ tenant_id: null, user_id: access.user.id, action: auditAction, entity_type: entityType, entity_id: entityId, metadata: {} });
  return NextResponse.json({ saved: true });
}
