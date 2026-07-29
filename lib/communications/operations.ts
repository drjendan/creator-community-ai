import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordCommunicationUsage(
  admin: SupabaseClient,
  tenantId: string,
  values: {
    attempted?: number;
    accepted?: number;
    delivered?: number;
    campaignsCreated?: number;
    campaignsSent?: number;
    templatesCreated?: number;
    automationRuns?: number;
  }
) {
  await admin.rpc("increment_communication_usage", {
    target_tenant: tenantId,
    attempted_delta: values.attempted ?? 0,
    accepted_delta: values.accepted ?? 0,
    delivered_delta: values.delivered ?? 0,
    campaigns_created_delta: values.campaignsCreated ?? 0,
    campaigns_sent_delta: values.campaignsSent ?? 0,
    templates_created_delta: values.templatesCreated ?? 0,
    automation_runs_delta: values.automationRuns ?? 0
  });
}

export async function recordCommunicationAudit(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await admin.from("communication_audit_events").insert({
    tenant_id: input.tenantId,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {}
  });
}
