import { CalendarDays, MapPin } from "lucide-react";
import { Button, Container } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

export function UpcomingEvent({ event }: Pick<LandingContent, "event">) {
  return (
    <section id="events" className="bg-white py-16">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-brand-200 bg-brand-50/60 p-8 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
              {event.eyebrow}
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-brand-900">{event.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-brand-700">{event.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-brand-700">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent-600" aria-hidden="true" />
                {event.when}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-600" aria-hidden="true" />
                {event.location}
              </span>
            </div>
          </div>
          <Button href={event.cta.href} size="lg" className="flex-shrink-0">
            {event.cta.label}
          </Button>
        </div>
      </Container>
    </section>
  );
}
