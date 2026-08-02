import { NextRequest, NextResponse } from "next/server";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  recordCommunicationAudit,
  recordCommunicationUsage
} from "@/lib/communications/operations";
import { trialMutationError } from "@/lib/trials";

const resources = {
  contacts: { table: "communication_contacts", entitlement: "communication_hub" },
  announcements: { table: "communication_announcements", entitlement: "communication_announcements" },
  messages: { table: "communication_messages", entitlement: "communication_direct_messages" },
  campaigns: { table: "email_campaigns", entitlement: "communication_email_campaigns" },
  templates: { table: "email_templates", entitlement: "communication_templates" }
} as const;

const writableFields: Record<keyof typeof resources, string[]> = {
  contacts: ["email", "first_name", "last_name", "status", "tags"],
  announcements: [
    "title", "summary", "body", "image_url", "status", "is_pinned",
    "publish_at", "expires_at", "audience_type", "audience_ids",
    "send_email_notification", "comments_enabled"
  ],
  messages: [
    "subject", "body", "status", "audience_type", "audience_ids",
    "send_email_notification", "scheduled_at", "sent_at"
  ],
  campaigns: [
    "internal_name", "subject", "preview_text", "template_id", "content_json",
    "html_content", "plain_text_content", "message_type", "audience_type",
    "audience_ids", "status", "scheduled_at"
  ],
  templates: [
    "name", "description", "category", "subject", "preview_text",
    "content_json", "html_content", "plain_text_content", "is_default",
    "is_active", "created_from_system_template"
  ]
};

async function getContext(resource: string) {
  const definition = resources[resource as keyof typeof resources];
  if (!definition) return null;
  const context = await getActiveTenantCommunicator();
  if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get("communication_hub") !== true || entitlements.get(definition.entitlement) !== true) return null;
  return { context, definition };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const authorized = await getContext(resource);
  if (!authorized) return NextResponse.json({ error: "This communication feature is unavailable." }, { status: 403 });
  const { data, error } = await authorized.context.supabase
    .from(authorized.definition.table)
    .select("*")
    .eq("tenant_id", authorized.context.tenant.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load records." }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const authorized = await getContext(resource);
  if (!authorized) return NextResponse.json({ error: "This communication feature is unavailable." }, { status: 403 });
  if (resource === "campaigns") {
    const trialError = await trialMutationError(authorized.context.tenant.id, "campaign");
    if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (body.status === "scheduled") {
    const scheduledValue = resource === "announcements" ? body.publish_at : body.scheduled_at;
    const scheduledAt = typeof scheduledValue === "string" ? new Date(scheduledValue) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Choose a valid schedule time in the future." }, { status: 400 });
    }
  }
  const id = typeof body.id === "string" ? body.id : undefined;
  const values: Record<string, unknown> = {
    tenant_id: authorized.context.tenant.id,
    updated_at: new Date().toISOString()
  };
  for (const field of writableFields[resource as keyof typeof resources]) {
    if (field in body) values[field] = body[field];
  }
  const required = resource === "contacts"
    ? ["email"]
    : resource === "campaigns"
    ? ["internal_name", "subject", "plain_text_content"]
    : resource === "templates"
      ? ["name", "subject", "plain_text_content"]
      : resource === "messages"
        ? ["subject", "body"]
        : ["title", "body"];
  if (required.some((field) => typeof values[field] !== "string" || !String(values[field]).trim())) {
    return NextResponse.json({ error: "Complete all required fields." }, { status: 400 });
  }
  if (resource === "campaigns" || resource === "templates") {
    const plainText = String(values.plain_text_content);
    const safeText = plainText
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
    values.html_content = `<div><p>${safeText.replaceAll("\n", "<br>")}</p></div>`;
    values.content_json = [{ type: "paragraph", text: plainText }];
  }
  if (!id && resource !== "contacts") {
    values.created_by = authorized.context.user.id;
    if ("updated_by" in values || resource === "campaigns" || resource === "templates") values.updated_by = authorized.context.user.id;
  }
  const query = id
    ? authorized.context.supabase.from(authorized.definition.table).update(values).eq("id", id).eq("tenant_id", authorized.context.tenant.id).select().single()
    : authorized.context.supabase.from(authorized.definition.table).insert(values).select().single();
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to save the record." }, { status: 400 });
  if (resource === "templates" && data.is_default) {
    await authorized.context.supabase
      .from("email_templates")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", authorized.context.tenant.id)
      .eq("category", data.category)
      .neq("id", data.id);
  }
  const admin = createAdminClient();
  if (!id && resource === "campaigns") {
    await recordCommunicationUsage(admin, authorized.context.tenant.id, {
      campaignsCreated: 1
    });
  }
  if (!id && resource === "templates") {
    await recordCommunicationUsage(admin, authorized.context.tenant.id, {
      templatesCreated: 1
    });
  }
  await recordCommunicationAudit(admin, {
    tenantId: authorized.context.tenant.id,
    actorId: authorized.context.user.id,
    actorRole: authorized.context.role,
    action: `${resource}.${id ? "updated" : "created"}`,
    resourceType: resource,
    resourceId: data.id
  });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const authorized = await getContext(resource);
  if (!authorized) return NextResponse.json({ error: "This communication feature is unavailable." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A record ID is required." }, { status: 400 });
  const archiveStatus = resource === "contacts" || resource === "announcements" || resource === "campaigns" || resource === "messages" ? "archived" : undefined;
  const query = archiveStatus
    ? authorized.context.supabase.from(authorized.definition.table).update({ status: archiveStatus, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", authorized.context.tenant.id)
    : authorized.context.supabase.from(authorized.definition.table).update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", authorized.context.tenant.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Unable to archive the record." }, { status: 400 });
  await recordCommunicationAudit(createAdminClient(), {
    tenantId: authorized.context.tenant.id,
    actorId: authorized.context.user.id,
    actorRole: authorized.context.role,
    action: `${resource}.archived`,
    resourceType: resource,
    resourceId: id
  });
  return NextResponse.json({ archived: true });
}
