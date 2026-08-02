import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("metadata"), endsAt: z.string().datetime().nullable(), timezone: z.string().trim().min(1).max(80), eventFormat: z.enum(["online","in_person","hybrid"]), venueName: z.string().trim().max(200), venueAddress: z.string().trim().max(1000), capacity: z.number().int().min(1).max(100000).nullable(), registrationRequired: z.boolean(), registrationDeadline: z.string().datetime().nullable(), waitlistEnabled: z.boolean(), memberInstructions: z.string().trim().max(10000), featured: z.boolean() }),
  z.object({ kind: z.literal("replay"), title: z.string().trim().min(2).max(180), description: z.string().trim().max(2000), url: z.string().trim().url().max(2000), accessLevel: z.enum(["public","member","paid"]), status: z.enum(["draft","published"]), allowDownload: z.boolean() }),
  z.object({ kind: z.literal("attendee"), registrationId: z.string().uuid(), status: z.enum(["registered","waitlisted","cancelled","attended","no_show"]) })
]);

async function authorize(eventId: string) {
  const context = await getActiveTenantWithPermission("tenant.events.manage"); if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase); if (entitlements.get("events") !== true) return null;
  const admin = createAdminClient(); const { data: event } = await admin.from("events").select("*").eq("id", eventId).eq("tenant_id", context.tenant.id).maybeSingle();
  return event ? { context, admin, event } : null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params; if (!z.string().uuid().safeParse(eventId).success) return NextResponse.json({ error: "A valid event is required." }, { status: 400 });
  const authorized = await authorize(eventId); if (!authorized) return NextResponse.json({ error: "Event management permission is required." }, { status: 403 });
  const { admin, context, event } = authorized;
  const [registrationResult, replayResult] = await Promise.all([
    admin.from("event_registrations").select("id,user_id,status,registered_at,cancelled_at,checked_in_at").eq("tenant_id", context.tenant.id).eq("event_id", eventId).order("registered_at"),
    admin.from("event_replays").select("*").eq("tenant_id", context.tenant.id).eq("event_id", eventId).order("sort_order")
  ]);
  const readError = registrationResult.error ?? replayResult.error;
  if (readError) return NextResponse.json({ error: /registered_at|title|sort_order|schema cache/i.test(readError.message) ? "Event migration 0028 is required." : "Unable to load event details." }, { status: 500 });
  const userIds = [...new Set((registrationResult.data ?? []).map((row) => row.user_id))];
  const { data: profiles } = userIds.length ? await admin.from("profiles").select("id,full_name,avatar_url").in("id", userIds) : { data: [] };
  return NextResponse.json({ event, registrations: registrationResult.data ?? [], replays: replayResult.data ?? [], profiles: profiles ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check the event detail fields." }, { status: 400 });
  const authorized = await authorize(eventId); if (!authorized) return NextResponse.json({ error: "Event management permission is required." }, { status: 403 });
  const { admin, context, event } = authorized; const trialError = await trialMutationError(context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const input = parsed.data; const now = new Date().toISOString(); let error: { message: string } | null = null;
  if (input.kind === "metadata") {
    if (input.endsAt && new Date(input.endsAt) <= new Date(event.starts_at)) return NextResponse.json({ error: "The event end must be after its start." }, { status: 400 });
    if (input.registrationDeadline && new Date(input.registrationDeadline) > new Date(event.starts_at)) return NextResponse.json({ error: "Registration must close before the event starts." }, { status: 400 });
    ({ error } = await admin.from("events").update({ ends_at: input.endsAt, timezone: input.timezone, event_format: input.eventFormat, venue_name: input.venueName, venue_address: input.venueAddress, capacity: input.capacity, registration_required: input.registrationRequired, registration_deadline: input.registrationDeadline, waitlist_enabled: input.waitlistEnabled, member_instructions: input.memberInstructions, featured: input.featured, updated_at: now }).eq("id", eventId).eq("tenant_id", context.tenant.id));
  } else if (input.kind === "replay") {
    const { count } = await admin.from("event_replays").select("id", { count: "exact", head: true }).eq("tenant_id", context.tenant.id).eq("event_id", eventId);
    ({ error } = await admin.from("event_replays").insert({ tenant_id: context.tenant.id, event_id: eventId, title: input.title, description: input.description, url: input.url, access_level: input.accessLevel, status: input.status, allow_download: input.allowDownload, sort_order: count ?? 0 }));
  } else {
    ({ error } = await admin.from("event_registrations").update({ status: input.status, checked_in_at: input.status === "attended" ? now : null, cancelled_at: input.status === "cancelled" ? now : null, updated_at: now }).eq("id", input.registrationId).eq("tenant_id", context.tenant.id).eq("event_id", eventId));
  }
  if (error) return NextResponse.json({ error: /ends_at|registered_at|allow_download|schema cache/i.test(error.message) ? "Event migration 0028 is required." : "Unable to save event details." }, { status: 500 });
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: `tenant.event.${input.kind}_saved`, entity_type: "event", entity_id: eventId });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params; const replayId = request.nextUrl.searchParams.get("replayId"); if (!replayId || !z.string().uuid().safeParse(replayId).success) return NextResponse.json({ error: "A valid replay is required." }, { status: 400 });
  const authorized = await authorize(eventId); if (!authorized) return NextResponse.json({ error: "Event management permission is required." }, { status: 403 });
  const trialError = await trialMutationError(authorized.context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const { error } = await authorized.admin.from("event_replays").delete().eq("id", replayId).eq("tenant_id", authorized.context.tenant.id).eq("event_id", eventId);
  if (error) return NextResponse.json({ error: "Unable to remove replay." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
