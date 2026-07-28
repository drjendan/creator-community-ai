import { BookOpen, Bot, CalendarDays, Headphones, MessageSquareText } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Container } from "@/components/ui";
import { getPublishedCourses, getPublishedEvents } from "@/lib/content/member-library";
import { getPublishedEpisodes } from "@/lib/content/member-episodes";
import { getTenantSiteBySlug } from "@/lib/tenant-site";

export default async function MemberDashboardPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const [tenant, episodes, courses, events] = await Promise.all([
    getTenantSiteBySlug(slug),
    getPublishedEpisodes(slug),
    getPublishedCourses(slug),
    getPublishedEvents(slug)
  ]);
  if (!tenant) notFound();
  return (
    <main className="py-16">
      <Container className="space-y-8">
        <div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Member dashboard</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Welcome to {tenant.name}</h1><p className="mt-2 text-brand-600">Your available organization content appears below. Personal activity appears only after you begin engaging.</p></div>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <EmptyState title={episodes.length ? `${episodes.length} available episode${episodes.length === 1 ? "" : "s"}` : "No episodes available yet."} description="Published episodes you can access will appear here." actionLabel="Browse Episodes" actionHref={`/demo/${slug}/episodes`} icon={Headphones} />
          <EmptyState title={courses.length ? `${courses.length} available course${courses.length === 1 ? "" : "s"}` : "No courses available yet."} description="Published courses you can access will appear here." actionLabel="Browse Courses" actionHref={`/demo/${slug}/courses`} icon={BookOpen} />
          <EmptyState title={events.length ? `${events.length} available event${events.length === 1 ? "" : "s"}` : "No upcoming events."} description="Published events you can access will appear here." actionLabel="Browse Events" actionHref={`/demo/${slug}/events`} icon={CalendarDays} />
          <EmptyState title="No community activity yet." description="Community conversations you can access will appear here." actionLabel="Open Community" actionHref={`/demo/${slug}/community`} icon={MessageSquareText} />
          <EmptyState title="No AI Coach activity yet." description="AI Coach history will appear only after you start a conversation." icon={Bot} />
        </section>
      </Container>
    </main>
  );
}
