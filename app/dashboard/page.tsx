import Link from "next/link";
import { Card, CardTitle } from "@/components/ui";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  communityActivity,
  creatorRecommendations,
  dashboardSummary,
  demoEpisodes,
  upcomingEvents
} from "@/lib/mock/podcastos";
import { EpisodeStatusBadge } from "@/components/podcast/EpisodeStatusBadge";

export default function DashboardOverviewPage() {
  const recentEpisodes = demoEpisodes.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-brand-900">Overview</h1>
          <p className="mt-1 text-sm text-brand-600">Demo data preview for tenant operations and engagement.</p>
        </div>
        <p className="rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-strong">Demo data</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total members" value={dashboardSummary.totalMembers} note="+6.4% vs last month" />
        <StatCard label="Published episodes" value={dashboardSummary.publishedEpisodes} />
        <StatCard label="Active courses" value={dashboardSummary.activeCourses} />
        <StatCard label="Upcoming events" value={dashboardSummary.upcomingEvents} />
        <StatCard label="AI Coach conversations" value={dashboardSummary.aiCoachConversations} />
        <StatCard label="Monthly engagement" value={dashboardSummary.monthlyEngagement} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle>Recent podcast episodes</CardTitle>
          <div className="mt-4 space-y-3">
            {recentEpisodes.map((episode) => (
              <Link
                key={episode.id}
                href={`/dashboard/podcast/${episode.id}`}
                className="block rounded-lg border border-brand-200 p-4 hover:bg-brand-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-900">{episode.title}</p>
                    <p className="mt-1 text-xs text-brand-500">Episode {episode.episodeNumber} • {episode.duration}</p>
                  </div>
                  <EpisodeStatusBadge status={episode.status} />
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Community activity</CardTitle>
          <ul className="mt-4 space-y-3 text-sm text-brand-700">
            {communityActivity.map((activity) => (
              <li key={activity} className="rounded-lg border border-brand-200 p-3">{activity}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Upcoming events</CardTitle>
          <div className="mt-4 space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.title} className="rounded-lg border border-brand-200 p-3">
                <p className="font-semibold text-brand-900">{event.title}</p>
                <p className="mt-1 text-xs text-brand-500">{event.date} • {event.format}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Creator recommendations</CardTitle>
          <ul className="mt-4 space-y-3 text-sm text-brand-700">
            {creatorRecommendations.map((recommendation) => (
              <li key={recommendation} className="rounded-lg border border-brand-200 p-3">{recommendation}</li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
