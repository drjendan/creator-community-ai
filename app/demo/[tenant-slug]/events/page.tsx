import { notFound } from "next/navigation";
import { MemberEventsExperience } from "@/components/tenant/MemberEventsExperience";
import { Container, SectionHeading } from "@/components/ui";
import { getPublishedEvents } from "@/lib/content/member-library";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function EventsPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params;
  if (!(await tenantHasFeature(tenantSlug, "events"))) notFound();
  const events = await getPublishedEvents(tenantSlug);
  return <main className="py-16"><Container><SectionHeading eyebrow="Live learning" title="Events and gatherings" subtitle="Register for upcoming workshops, join live gatherings, and revisit event replays." /><MemberEventsExperience initialEvents={events} tenantSlug={tenantSlug} /></Container></main>;
}
