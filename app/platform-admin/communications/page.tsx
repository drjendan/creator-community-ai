import { Mail, Send, ServerCog, TriangleAlert } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, CardTitle } from "@/components/ui";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformCommunicationsPage() {
  const access = await getPlatformAdministrator("platform.communication.view");
  if (!access) {
    return <EmptyState title="Platform communications access is unavailable." description="Your platform role does not include communications visibility." icon={Mail} />;
  }

  const admin = createAdminClient();
  const [tenantResult, configResult, campaignResult, recipientResult, usageResult] = await Promise.all([
    admin.from("tenants").select("id,name,status").neq("status", "deleted"),
    admin.from("tenant_communication_provider_configs").select("tenant_id,provider,connection_status,verification_status,from_email,is_active,updated_at"),
    admin.from("email_campaigns").select("tenant_id,status,sent_at,created_at"),
    admin.from("email_campaign_recipients").select("tenant_id,status,delivered_at,failed_at"),
    admin.from("communication_usage").select("tenant_id,period_start,emails_attempted,emails_delivered,campaigns_sent").order("period_start", { ascending: false })
  ]);
  const tenants = tenantResult.data ?? [];
  const configs = configResult.data ?? [];
  const campaigns = campaignResult.data ?? [];
  const recipients = recipientResult.data ?? [];
  const usage = usageResult.data ?? [];
  const connected = configs.filter((row) => row.is_active && row.connection_status === "connected" && row.verification_status === "verified").length;
  const sentCampaigns = campaigns.filter((row) => row.status === "sent" || row.status === "partially_sent").length;
  const delivered = recipients.filter((row) => row.status === "delivered" || Boolean(row.delivered_at)).length;
  const failed = recipients.filter((row) => row.status === "failed" || Boolean(row.failed_at)).length;
  const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Platform operations</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Platform Communications</h1>
        <p className="mt-2 text-sm text-brand-600">Cross-tenant provider health and delivery visibility. Tenant credentials and message content are never displayed.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform communication summary">
        <StatCard label="Connected senders" value={connected} note={`${tenants.length} tenant workspaces`} />
        <StatCard label="Campaigns sent" value={sentCampaigns} />
        <StatCard label="Messages delivered" value={delivered} />
        <StatCard label="Delivery failures" value={failed} />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-brand-100 px-5 py-4"><CardTitle>Sender connections</CardTitle></div>
          {configs.length === 0 ? <p className="p-6 text-sm text-brand-600">No tenant sender configurations are recorded.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand-50 text-brand-700"><tr><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Provider</th><th className="px-5 py-3">Sender</th><th className="px-5 py-3">Status</th></tr></thead>
                <tbody>{configs.map((config) => {
                  const healthy = config.is_active && config.connection_status === "connected" && config.verification_status === "verified";
                  return <tr key={`${config.tenant_id}-${config.provider}`} className="border-t border-brand-100"><td className="px-5 py-4 font-semibold text-brand-900">{tenantNames.get(config.tenant_id) ?? "Unknown tenant"}</td><td className="px-5 py-4 capitalize text-brand-600">{config.provider}</td><td className="px-5 py-4 text-brand-600">{config.from_email}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${healthy ? "bg-success-soft text-success-strong" : "bg-warning-soft text-warning-strong"}`}>{healthy ? "Connected" : `${config.connection_status} / ${config.verification_status}`}</span></td></tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2"><ServerCog className="h-5 w-5 text-accent-700" /><CardTitle>Recorded monthly usage</CardTitle></div>
          {usage.length === 0 ? <p className="mt-4 text-sm text-brand-600">No communication usage periods are recorded.</p> : (
            <ul className="mt-4 space-y-3">{usage.slice(0, 8).map((row) => <li key={`${row.tenant_id}-${row.period_start}`} className="rounded-xl border border-brand-100 p-3"><p className="font-semibold text-brand-900">{tenantNames.get(row.tenant_id) ?? "Unknown tenant"}</p><p className="mt-1 text-xs text-brand-600">{row.period_start}: {row.emails_delivered}/{row.emails_attempted} delivered · {row.campaigns_sent} campaigns</p></li>)}</ul>
          )}
        </Card>
      </section>
      {failed > 0 && <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-brand-800"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>{failed} delivery failures</strong> are recorded. Investigate the affected tenant sender configuration and provider events without exposing recipient data.</p></div>}
      <p className="flex items-center gap-2 text-xs text-brand-500"><Send className="h-4 w-4" />Platform visibility is read-only; tenant communication managers retain control of campaigns and sender configuration.</p>
    </div>
  );
}
