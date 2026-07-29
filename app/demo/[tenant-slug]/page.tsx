import { ArrowRight, BookOpen, CalendarDays, FileText, Headphones } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button, Container } from "@/components/ui";
import { getPublishedCourses, getPublishedEvents, getPublishedResources } from "@/lib/content/member-library";
import { getPublishedEpisodes } from "@/lib/content/member-episodes";
import { getTenantSiteBySlug } from "@/lib/tenant-site";

export default async function TenantHomePage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const [tenant, episodes, courses, events, resources] = await Promise.all([
    getTenantSiteBySlug(slug),
    getPublishedEpisodes(slug),
    getPublishedCourses(slug),
    getPublishedEvents(slug),
    getPublishedResources(slug)
  ]);
  if (!tenant) notFound();
  const enabled = new Set(tenant.enabledFeatures ?? []);
  const cards = [
    ...(enabled.has("podcasts") ? [{ title: episodes.length ? `${episodes.length} published episode${episodes.length === 1 ? "" : "s"}` : "No episodes published yet.", description: "Published episodes from this organization appear here.", action: "Browse Episodes", href: `/demo/${slug}/episodes`, icon: Headphones }] : []),
    ...(enabled.has("courses") ? [{ title: courses.length ? `${courses.length} published course${courses.length === 1 ? "" : "s"}` : "No courses published yet.", description: "Published learning experiences from this organization appear here.", action: "Browse Courses", href: `/demo/${slug}/courses`, icon: BookOpen }] : []),
    ...(enabled.has("events") ? [{ title: events.length ? `${events.length} published event${events.length === 1 ? "" : "s"}` : "No upcoming events.", description: "Published events from this organization appear here.", action: "Browse Events", href: `/demo/${slug}/events`, icon: CalendarDays }] : []),
    ...(enabled.has("resources") ? [{ title: resources.length ? `${resources.length} published resource${resources.length === 1 ? "" : "s"}` : "No resources published yet.", description: "Published resources from this organization appear here.", action: "Browse Resources", href: `/demo/${slug}/resources`, icon: FileText }] : [])
  ];
  return (
    <main>
      <section className="upnexx-hero bg-cover bg-center text-white" style={tenant.heroImageUrl ? { backgroundImage: `linear-gradient(#0009,#0009),url("${tenant.heroImageUrl}")` } : { backgroundColor: tenant.primaryColor }}>
        <Container className="py-20">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-highlight-300">{tenant.name}</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-extrabold leading-tight">{tenant.tagline}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-brand-100">Explore the content, learning, community, and events published by {tenant.name}.</p>
          {tenant.communicationEnabled && <Button href={`/demo/${slug}/welcome`} className="mt-8">Open Member Dashboard <ArrowRight className="h-4 w-4" /></Button>}
        </Container>
      </section>
      <section className="py-16">
        <Container className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => <EmptyState key={card.href} title={card.title} description={card.description} actionLabel={card.action} actionHref={card.href} icon={card.icon} />)}
          {!cards.length && <EmptyState title="No member features are enabled" description="This organization has not enabled any member-facing content." />}
        </Container>
      </section>
    </main>
  );
}
