import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card } from "@/components/ui";
import { getTenantAnalyticsData } from "@/lib/dashboard-data";

export default async function AnalyticsPage() {
  const data = await getTenantAnalyticsData();
  if (!data || data.metrics.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Analytics</h1>
          <p className="mt-2 text-sm text-brand-600">Understand engagement across your organization.</p>
        </div>
        <EmptyState
          title="No analytics available yet."
          description="Analytics will begin appearing after members start engaging with your platform. This chart will populate after your platform begins receiving activity."
          icon={BarChart3}
        />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-extrabold text-brand-900">Analytics</h1><p className="mt-2 text-sm text-brand-600">Real metrics for {data.tenant.name}.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((metric) => (
          <Card key={metric.id}>
            <p className="text-sm font-semibold capitalize text-brand-600">{metric.metric.replaceAll("_", " ")}</p>
            <p className="mt-3 font-display text-3xl font-bold text-brand-900">{String(metric.value)}</p>
            <p className="mt-2 text-xs text-brand-500">{new Date(metric.period_start).toLocaleDateString()} – {new Date(metric.period_end).toLocaleDateString()}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
