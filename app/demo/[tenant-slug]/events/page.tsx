/* eslint-disable @next/next/no-img-element */
import { CalendarDays, ExternalLink, Video } from "lucide-react";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getPublishedEvents } from "@/lib/content/member-library";

export default async function EventsPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params;
  const events = await getPublishedEvents(tenantSlug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Live learning" title="Events and gatherings" subtitle="Join upcoming workshops, livestreams, and member conversations." />
        {events.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <Card key={event.id} className="flex min-h-72 flex-col">{event.cover_image_url ? <div className="overflow-hidden rounded-xl bg-brand-100">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={event.cover_image_url} alt="" className="aspect-video w-full object-cover" /></div> : <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-accent-700 to-highlight-500 text-white"><div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" /><CalendarDays className="h-12 w-12" /><span className="absolute bottom-3 left-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white/85">Live event</span></div>}<div className="mt-5 flex items-center gap-2 text-sm font-bold text-accent-700"><CalendarDays className="h-5 w-5" />{new Date(event.starts_at).toLocaleString()}</div><h2 className="mt-4 font-display text-2xl font-bold text-brand-900">{event.title}</h2><p className="mt-3 line-clamp-4 text-sm leading-6 text-brand-600">{event.description || "Join this member event."}</p><div className="mt-auto pt-6">{event.location_url ? <a href={event.location_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-bold text-white"><Video className="h-4 w-4" />Join event<ExternalLink className="h-4 w-4" /></a> : <span className="text-sm font-semibold text-brand-400">Joining details will be added soon.</span>}</div></Card>)}</div> : <p className="mt-10 rounded-xl border border-brand-200 bg-white p-10 text-center text-brand-500">No events have been published yet.</p>}
      </Container>
    </main>
  );
}

