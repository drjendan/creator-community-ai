import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantMemberContext } from "@/lib/communications/member-context";

const schema = z.object({ tenantSlug: z.string().trim().min(1).max(120), eventId: z.string().uuid(), action: z.enum(["register","cancel"]) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check the event registration request." }, { status: 400 });
  const input = parsed.data; const context = await getTenantMemberContext(input.tenantSlug); if (!context) return NextResponse.json({ error: "Active organization membership is required." }, { status: 401 });
  const { data: event } = await context.supabase.from("events").select("id").eq("id", input.eventId).eq("tenant_id", context.tenant.id).eq("status", "published").maybeSingle();
  if (!event) return NextResponse.json({ error: "This event is not available." }, { status: 404 });
  const functionName = input.action === "register" ? "register_for_event" : "cancel_event_registration";
  const { data, error } = await context.supabase.rpc(functionName, { target_event: input.eventId });
  if (error) {
    const message = error.message;
    if (/registration_closed/i.test(message)) return NextResponse.json({ error: "Registration has closed." }, { status: 409 });
    if (/event_full/i.test(message)) return NextResponse.json({ error: "This event is full." }, { status: 409 });
    if (/event_unavailable/i.test(message)) return NextResponse.json({ error: "This event is no longer available." }, { status: 409 });
    if (/register_for_event|schema cache/i.test(message)) return NextResponse.json({ error: "Event migration 0028 is required." }, { status: 503 });
    return NextResponse.json({ error: "Unable to update event registration." }, { status: 500 });
  }
  return NextResponse.json({ status: data });
}
