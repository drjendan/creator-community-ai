import { NextResponse } from "next/server";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { resolveEligibleRecipients } from "@/lib/communications/audience";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    entitlements.get("communication_segments") !== true
  ) {
    return NextResponse.json(
      { error: "Audience segments are unavailable." },
      { status: 403 }
    );
  }
  const { id } = await params;
  const recipients = await resolveEligibleRecipients({
    tenantId: context.tenant.id,
    audienceType: "segments",
    audienceIds: [id],
    marketing: false
  });
  return NextResponse.json({
    count: recipients.length,
    recipients: recipients.map((recipient) => ({
      userId: recipient.userId,
      email: recipient.email
    }))
  });
}
