import { Activity } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardTitle } from "@/components/ui";
import { getPlatformDashboardData } from "@/lib/dashboard-data";

export default async function PlatformAdminPage() {
  const data = await getPlatformDashboardData();
  const stats = [
    ["Total tenants", data.totalTenants],
    ["Active subscriptions", data.activeSubscriptions],
    ["Tenant users", data.totalUsers],
    ["AI tokens recorded", data.aiTokens],
    ["Open support requests", data.openSupportRequests]
  ] as const;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Platform operations</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Overview</h1>
        <p className="mt-2 text-sm text-brand-600">All values below are loaded from production platform records.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value]) => <StatCard key={label} label={label} value={value} />)}
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <EmptyState title="No platform trend chart available yet." description="This chart will populate after historical platform metrics are recorded." icon={Activity} />
        <Card>
          <CardTitle>Recent platform activity</CardTitle>
          {data.activity.length === 0 ? (
            <div className="mt-5"><p className="font-display text-xl font-bold text-brand-900">No recent activity.</p><p className="mt-2 text-sm text-brand-600">Administrative events will appear here when they occur.</p></div>
          ) : (
            <ul className="mt-5 space-y-3">
              {data.activity.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-brand-100 p-3">
                  <p className="text-sm font-semibold capitalize text-brand-800">{entry.action.split(".").at(-1)?.replaceAll("_", " ")}</p>
                  <time className="mt-1 block text-xs text-brand-500" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
