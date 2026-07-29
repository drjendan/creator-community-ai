import { NextRequest, NextResponse } from "next/server";
import { getTenantMemberContext } from "@/lib/communications/member-context";

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as { tenantSlug?: string; recipientId?: string; read?: boolean; archived?: boolean } | null;
  const context = await getTenantMemberContext(body?.tenantSlug ?? "");
  if (!context) return NextResponse.json({ error: "Active tenant membership is required." }, { status: 403 });
  const { error } = await context.supabase.from("communication_message_recipients").update({
    read_at: body?.read ? new Date().toISOString() : null,
    archived_at: body?.archived ? new Date().toISOString() : null
  }).eq("id", body?.recipientId).eq("tenant_id", context.tenant.id).eq("user_id", context.user.id);
  if (error) return NextResponse.json({ error: "Unable to update message." }, { status: 500 });
  return NextResponse.json({ updated: true });
}
