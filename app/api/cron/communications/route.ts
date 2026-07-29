import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processCampaign } from "@/lib/communications/campaign-service";
import { deliverMessage } from "@/lib/communications/message-service";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: campaigns } = await admin.from("email_campaigns").select("id,tenant_id").eq("status", "scheduled").lte("scheduled_at", now).limit(25);
  const { data: messages } = await admin.from("communication_messages").select("id,tenant_id").eq("status", "scheduled").lte("scheduled_at", now).limit(25);
  const campaignResults = [];
  const messageResults = [];
  for (const campaign of campaigns ?? []) campaignResults.push(await processCampaign(admin, campaign.tenant_id, campaign.id, new URL(request.url).origin));
  for (const message of messages ?? []) messageResults.push(await deliverMessage(admin, message.tenant_id, message.id));
  await admin.from("communication_announcements").update({ status: "published", published_by: null, updated_at: now }).eq("status", "scheduled").lte("publish_at", now);
  await admin.from("communication_announcements").update({ status: "expired", updated_at: now }).eq("status", "published").lte("expires_at", now);
  return NextResponse.json({
    processedCampaigns: campaignResults.length,
    processedMessages: messageResults.length,
    campaignResults,
    messageResults
  });
}
