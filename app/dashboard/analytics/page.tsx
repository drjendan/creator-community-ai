import { BarChart3 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, CardTitle } from "@/components/ui";
import { getTenantAnalyticsData } from "@/lib/dashboard-data";
import { AdminInsightsManager } from "@/components/dashboard/AdminInsightsManager";

export default async function AnalyticsPage() {
  const data = await getTenantAnalyticsData();
  if (!data) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Analytics</h1>
          <p className="mt-2 text-sm text-brand-600">Your role does not include tenant analytics access.</p>
        </div>
        <EmptyState
          title="Analytics access is unavailable."
          description="Ask a tenant owner to assign a role with analytics permission."
          icon={BarChart3}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Tenant operations</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Analytics</h1>
        <p className="mt-2 text-sm text-brand-600">Production activity recorded for {data.tenant.name}. No projected or sample values are included.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tenant analytics summary">
        <StatCard label="Active members" value={data.summary.activeMembers} note={`${data.summary.newMembers30d} joined in the last 30 days`} />
        <StatCard label="Course enrollments" value={data.summary.courseEnrollments} />
        <StatCard label="Completed lessons" value={data.summary.completedLessons} note={`${data.summary.averageLessonProgress}% average lesson progress`} />
        <StatCard label="Event registrations" value={data.summary.eventRegistrations} />
        <StatCard label="Community posts" value={data.summary.communityPosts30d} note="Published in the last 30 days" />
        <StatCard label="Emails delivered" value={data.summary.emailsDelivered} note={`${data.summary.emailsFailed} failed deliveries`} />
        <StatCard label="AI tokens" value={data.summary.aiTokens30d.toLocaleString()} note="Used in the last 30 days" />
      </section>
      <Card>
        <CardTitle>Recorded reporting periods</CardTitle>
        {data.metrics.length === 0 ? (
          <div className="mt-5">
            <p className="font-semibold text-brand-900">No scheduled metric snapshots have been recorded.</p>
            <p className="mt-2 text-sm text-brand-600">The operational totals above are calculated directly from current production records.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.metrics.map((metric) => (
              <div key={metric.id} className="rounded-xl border border-brand-100 p-4">
                <p className="text-sm font-semibold capitalize text-brand-600">{metric.metric.replaceAll("_", " ")}</p>
                <p className="mt-3 font-display text-3xl font-bold text-brand-900">{String(metric.value)}</p>
                <p className="mt-2 text-xs text-brand-500">{new Date(metric.period_start).toLocaleDateString()} – {new Date(metric.period_end).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
      <AdminInsightsManager />
      <p className="text-xs text-brand-500">Calculated {new Date(data.generatedAt).toLocaleString()}.</p>
    </div>
  );
}
