/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CommunicationRecords } from "@/components/communications/CommunicationRecords";
import { EmailProviderSettings } from "@/components/communications/EmailProviderSettings";
import { AudienceSegments } from "@/components/communications/AudienceSegments";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

const entitlements: Record<string, string> = {
  announcements: "communication_announcements",
  messages: "communication_direct_messages",
  campaigns: "communication_email_campaigns",
  templates: "communication_templates",
  segments: "communication_segments",
  scheduled: "communication_scheduling",
  reports: "communication_reports",
  settings: "communication_byop_email"
};

export default async function CommunicationsPage({
  params
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section: parts } = await params;
  const section = parts?.[0] ?? "overview";
  if (!["overview", ...Object.keys(entitlements)].includes(section)) notFound();

  const context = await getActiveTenantCommunicator();
  if (!context) {
    return (
      <EmptyState
        title="Communication management access is required"
        description="Ask an organization owner to assign an authorized communication role."
        icon={Mail}
      />
    );
  }
  const enabled = await getTenantEntitlements(
    context.tenant.id,
    context.supabase
  );
  if (
    enabled.get("communication_hub") !== true ||
    (entitlements[section] &&
      enabled.get(entitlements[section]) !== true)
  ) {
    notFound();
  }

  if (section === "settings") return <EmailProviderSettings />;
  if (section === "segments") return <AudienceSegments />;
  if (
    ["announcements", "messages", "campaigns", "templates"].includes(section)
  ) {
    return (
      <CommunicationRecords
        resource={
          section as
            | "announcements"
            | "messages"
            | "campaigns"
            | "templates"
        }
      />
    );
  }

  if (section === "scheduled") {
    const [
      { data: campaigns },
      { data: announcements },
      { data: messages }
    ] = await Promise.all([
      context.supabase
        .from("email_campaigns")
        .select("id,internal_name,scheduled_at,status")
        .eq("tenant_id", context.tenant.id)
        .eq("status", "scheduled")
        .order("scheduled_at"),
      context.supabase
        .from("communication_announcements")
        .select("id,title,publish_at,status")
        .eq("tenant_id", context.tenant.id)
        .eq("status", "scheduled")
        .order("publish_at"),
      context.supabase
        .from("communication_messages")
        .select("id,subject,scheduled_at,status")
        .eq("tenant_id", context.tenant.id)
        .eq("status", "scheduled")
        .order("scheduled_at")
    ]);
    const rows = [
      ...(campaigns ?? []).map((item: any) => ({
        id: item.id,
        name: item.internal_name,
        at: item.scheduled_at,
        type: "Campaign"
      })),
      ...(announcements ?? []).map((item: any) => ({
        id: item.id,
        name: item.title,
        at: item.publish_at,
        type: "Announcement"
      })),
      ...(messages ?? []).map((item: any) => ({
        id: item.id,
        name: item.subject,
        at: item.scheduled_at,
        type: "Message"
      }))
    ].sort(
      (a, b) =>
        new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime()
    );
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">
            Scheduled Communications
          </h1>
          <p className="mt-2 text-sm text-brand-600">
            Times are stored in UTC and displayed in your current timezone.
          </p>
        </div>
        <Card>
          {rows.length ? (
            <div className="divide-y divide-brand-100">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-bold text-brand-900">{row.name}</p>
                    <p className="text-xs text-brand-500">{row.type}</p>
                  </div>
                  <p className="text-sm text-brand-600">
                    {new Date(row.at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-600">
              No communications are scheduled.
            </p>
          )}
        </Card>
      </div>
    );
  }

  if (section === "reports") {
    const [
      { data: recipients },
      { data: events },
      { count: unsubscribes }
    ] = await Promise.all([
      context.supabase
        .from("email_campaign_recipients")
        .select("status,provider_message_id")
        .eq("tenant_id", context.tenant.id),
      context.supabase
        .from("communication_delivery_events")
        .select("event_type")
        .eq("tenant_id", context.tenant.id),
      context.supabase
        .from("communication_suppressions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", context.tenant.id)
        .eq("reason", "unsubscribed")
    ]);
    const eventCounts = (events ?? []).reduce<Record<string, number>>(
      (counts: Record<string, number>, event: any) => ({
        ...counts,
        [event.event_type]: (counts[event.event_type] ?? 0) + 1
      }),
      {}
    );
    const metrics = [
      ["Attempted", recipients?.length ?? 0],
      [
        "Accepted",
        (recipients ?? []).filter((item) => item.provider_message_id).length
      ],
      ["Delivered", eventCounts.delivered ?? 0],
      [
        "Failed",
        (recipients ?? []).filter((item) => item.status === "failed").length
      ],
      ["Bounced", eventCounts.bounced ?? 0],
      ["Complaints", eventCounts.complained ?? 0],
      ["Opens", eventCounts.opened ?? 0],
      ["Clicks", eventCounts.clicked ?? 0],
      ["Unsubscribes", unsubscribes ?? 0]
    ] as const;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-brand-900">
              Communication Reports
            </h1>
            <p className="mt-2 text-sm text-brand-600">
              Provider and application results only. Opens and clicks are shown
              only when Resend reports them; open tracking is not perfectly
              accurate.
            </p>
          </div>
          <Button
            href="/api/communications/reports/export"
            variant="secondary"
          >
            Export CSV
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([label, value]) => (
            <Card key={label}>
              <p className="text-sm text-brand-500">{label}</p>
              <p className="mt-2 text-3xl font-extrabold">{value}</p>
            </Card>
          ))}
        </div>
        {!recipients?.length && (
          <EmptyState
            title="No delivery activity"
            description="No campaign delivery attempts are recorded."
            icon={Mail}
          />
        )}
      </div>
    );
  }

  const [
    { count: draftCampaigns },
    { count: scheduledCampaigns },
    { count: activeAnnouncements },
    { count: failedDeliveries },
    { data: provider },
    { data: recentCampaigns }
  ] = await Promise.all([
    context.supabase
      .from("email_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "draft"),
    context.supabase
      .from("email_campaigns")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "scheduled"),
    context.supabase
      .from("communication_announcements")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("status", "published"),
    context.supabase
      .from("communication_delivery_events")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .in("event_type", ["failed", "bounced", "complained"]),
    context.supabase
      .from("tenant_communication_provider_configs")
      .select("provider,connection_status,verification_status")
      .eq("tenant_id", context.tenant.id)
      .eq("is_active", true)
      .maybeSingle(),
    context.supabase
      .from("email_campaigns")
      .select("id,internal_name,status,created_at")
      .eq("tenant_id", context.tenant.id)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);
  const cards = [
    ["Draft campaigns", draftCampaigns ?? 0],
    ["Scheduled campaigns", scheduledCampaigns ?? 0],
    ["Failed deliveries", failedDeliveries ?? 0],
    ["Active announcements", activeAnnouncements ?? 0],
    ["Email provider", provider?.provider ?? "Not connected"],
    ["Connection", provider?.connection_status ?? "Not configured"],
    ["Verification", provider?.verification_status ?? "Unverified"]
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">
          Communication Hub
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          Tenant-scoped announcements, messages, email campaigns, and delivery
          reporting.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-brand-500">{label}</p>
            <p className="mt-2 text-2xl font-extrabold capitalize text-brand-900">
              {String(value).replaceAll("_", " ")}
            </p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">
          Recent campaigns
        </h2>
        {recentCampaigns?.length ? (
          <div className="mt-4 divide-y divide-brand-100">
            {recentCampaigns.map((campaign: any) => (
              <div
                key={campaign.id}
                className="flex justify-between gap-3 py-3"
              >
                <p className="font-semibold text-brand-800">
                  {campaign.internal_name}
                </p>
                <span className="text-sm capitalize text-brand-500">
                  {campaign.status.replaceAll("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-600">
            No email campaigns are recorded.
          </p>
        )}
      </Card>
    </div>
  );
}
