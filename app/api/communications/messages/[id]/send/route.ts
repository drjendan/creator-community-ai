import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { deliverMessage } from "@/lib/communications/message-service";
import { recordCommunicationAudit } from "@/lib/communications/operations";

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const context = await getActiveTenantCommunicator();
  if (!context) {
    return NextResponse.json(
      { error: "Communication management access is required." },
      { status: 403 }
    );
  }
  const entitlements = await getTenantEntitlements(
    context.tenant.id,
    context.supabase
  );
  if (
    entitlements.get("communication_hub") !== true ||
    entitlements.get("communication_direct_messages") !== true
  ) {
    return NextResponse.json(
      { error: "Direct messaging is not enabled." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const result = await deliverMessage(
    admin,
    context.tenant.id,
    id
  );
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.httpStatus }
    );
  }
  await recordCommunicationAudit(admin, {
    tenantId: context.tenant.id,
    actorId: context.user.id,
    actorRole: context.role,
    action: "message.sent",
    resourceType: "communication_message",
    resourceId: id,
    metadata: {
      attempted: result.attempted,
      emailAccepted: result.accepted
    }
  });
  return NextResponse.json(result);
}
