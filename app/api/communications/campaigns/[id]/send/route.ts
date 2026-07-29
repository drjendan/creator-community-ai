import { NextRequest, NextResponse } from "next/server";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { processCampaign } from "@/lib/communications/campaign-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordCommunicationAudit } from "@/lib/communications/operations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getActiveTenantCommunicator();
  if (!context) return NextResponse.json({ error: "Communication management access is required." }, { status: 403 });
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get("communication_hub") !== true || entitlements.get("communication_email_campaigns") !== true) {
    return NextResponse.json({ error: "Email campaigns are unavailable." }, { status: 403 });
  }
  const { id } = await params;
  const admin = createAdminClient();
  const result = await processCampaign(admin, context.tenant.id, id, new URL(request.url).origin);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  await recordCommunicationAudit(admin, {
    tenantId: context.tenant.id,
    actorId: context.user.id,
    actorRole: context.role,
    action: "campaign.sent",
    resourceType: "email_campaign",
    resourceId: id,
    metadata: { attempted: result.attempted, accepted: result.accepted }
  });
  return NextResponse.json(result);
}
