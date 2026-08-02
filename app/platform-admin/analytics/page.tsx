import { BarChart3 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, CardTitle } from "@/components/ui";
import { getPlatformAnalyticsData } from "@/lib/dashboard-data";

function StatusBreakdown({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return <div className="mt-4 rounded-xl border border-dashed border-brand-200 bg-brand-50 p-6"><p className="font-semibold text-brand-900">No data available yet</p><p className="mt-2 text-sm text-brand-600">Production activity will appear here after it is recorded.</p></div>;
  return (
    <ul className="mt-4 space-y-3">
      {entries.map(([status, count]) => (
        <li key={status} className="flex items-center justify-between rounded-xl border border-brand-100 px-4 py-3">
          <span className="text-sm font-semibold capitalize text-brand-700">{status.replaceAll("_", " ")}</span>
          <span className="font-display text-lg font-bold text-brand-900">{count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function PlatformAnalyticsPage() {
  const data = await getPlatformAnalyticsData();
  if (!data) {
    return (
      <EmptyState
        title="Platform analytics access is unavailable."
        description="Your platform role does not include analytics permission."
        icon={BarChart3}
      />
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Platform operations</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Platform Analytics</h1>
        <p className="mt-2 text-sm text-brand-600">Current production-wide operational totals. No sample or forecast values are included.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Platform analytics summary">
        <StatCard label="Active tenants" value={data.summary.activeTenants} note={`${data.summary.totalTenants} total tenants`} />
        <StatCard label="New tenants" value={data.summary.newTenants30d} note="Created in the last 30 days" />
        <StatCard label="Active members" value={data.summary.activeMembers} />
        <StatCard label="Active subscriptions" value={data.summary.activeSubscriptions} note="Active and trialing" />
        <StatCard label="AI tokens" value={data.summary.aiTokens30d.toLocaleString()} note="Used in the last 30 days" />
        <StatCard label="AI provider cost" value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.summary.aiCost30d)} note="Recorded in the last 30 days" />
        <StatCard label="Open support requests" value={data.summary.openSupportRequests} />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Tenant status</CardTitle>
          <StatusBreakdown values={data.tenantStatusCounts} />
        </Card>
        <Card>
          <CardTitle>Subscription status</CardTitle>
          <StatusBreakdown values={data.subscriptionStatusCounts} />
        </Card>
      </section>
      <p className="text-xs text-brand-500">Calculated {new Date(data.generatedAt).toLocaleString()}.</p>
    </div>
  );
}
