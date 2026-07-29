import { NextResponse } from "next/server";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

function csv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
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
    entitlements.get("communication_reports") !== true
  ) {
    return NextResponse.json(
      { error: "Communication reports are not enabled." },
      { status: 403 }
    );
  }

  const [
    { data: campaigns },
    { data: recipients },
    { data: events },
    { data: provider }
  ] =
    await Promise.all([
      context.supabase
        .from("email_campaigns")
        .select("id,internal_name,status,audience_type,sent_at,created_at")
        .eq("tenant_id", context.tenant.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("email_campaign_recipients")
        .select("campaign_id,status,provider_message_id")
        .eq("tenant_id", context.tenant.id),
      context.supabase
        .from("communication_delivery_events")
        .select("campaign_id,event_type")
        .eq("tenant_id", context.tenant.id),
      context.supabase
        .from("tenant_communication_provider_configs")
        .select("provider,from_email")
        .eq("tenant_id", context.tenant.id)
        .eq("is_active", true)
        .maybeSingle()
    ]);

  const counts = new Map<
    string,
    {
      attempted: number;
      accepted: number;
      delivered: number;
      failed: number;
      bounced: number;
      complaints: number;
      opens: number;
      clicks: number;
    }
  >();
  for (const recipient of recipients ?? []) {
    const current = counts.get(recipient.campaign_id) ?? {
      attempted: 0,
      accepted: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      complaints: 0,
      opens: 0,
      clicks: 0
    };
    current.attempted += 1;
    if (recipient.provider_message_id) current.accepted += 1;
    if (recipient.status === "failed") current.failed += 1;
    counts.set(recipient.campaign_id, current);
  }
  for (const event of events ?? []) {
    if (!event.campaign_id) continue;
    const current = counts.get(event.campaign_id);
    if (!current) continue;
    if (event.event_type === "delivered") current.delivered += 1;
    if (event.event_type === "bounced") current.bounced += 1;
    if (event.event_type === "complained") current.complaints += 1;
    if (event.event_type === "opened") current.opens += 1;
    if (event.event_type === "clicked") current.clicks += 1;
  }

  const header = [
    "Campaign",
    "Status",
    "Audience",
    "Eligible recipients",
    "Attempted",
    "Accepted",
    "Delivered",
    "Failed",
    "Bounced",
    "Complaints",
    "Opens",
    "Clicks",
    "Sent date",
    "Sender",
    "Provider"
  ];
  const rows = (campaigns ?? []).map((campaign) => {
    const values = counts.get(campaign.id) ?? {
      attempted: 0,
      accepted: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      complaints: 0,
      opens: 0,
      clicks: 0
    };
    return [
      campaign.internal_name,
      campaign.status,
      campaign.audience_type,
      values.attempted,
      values.attempted,
      values.accepted,
      values.delivered,
      values.failed,
      values.bounced,
      values.complaints,
      values.opens,
      values.clicks,
      campaign.sent_at ?? "",
      provider?.from_email ?? "",
      provider?.provider ?? ""
    ]
      .map(csv)
      .join(",");
  });
  const content = [header.map(csv).join(","), ...rows].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="communication-report-${date}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
