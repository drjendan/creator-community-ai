import { Mic, GraduationCap, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, Container } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

export function FeaturedContent({ featured }: Pick<LandingContent, "featured">) {
  const items = [
    { ...featured.episode, id: "podcast", icon: Mic },
    { ...featured.course, id: "learning", icon: GraduationCap },
    { ...featured.resource, id: "resources", icon: FileText }
  ];

  return (
    <section id="podcast" className="bg-white py-16">
      <Container>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map(({ id, icon: Icon, eyebrow, title, description, meta, href }) => (
            <Card key={id} className="flex flex-col">
              <Icon className="h-5 w-5 text-accent-600" strokeWidth={1.75} aria-hidden="true" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-accent-600">
                {eyebrow}
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-brand-900">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-brand-700">{description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-brand-500">{meta}</span>
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:text-accent-600"
                >
                  Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
