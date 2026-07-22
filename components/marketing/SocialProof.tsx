import { Card, Container, SectionHeading } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

export function SocialProof({ proof }: Pick<LandingContent, "proof">) {
  return (
    <section className="border-t border-brand-200/70 py-16">
      <Container>
        <SectionHeading eyebrow={proof.eyebrow} title={proof.title} align="center" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {proof.testimonials.map((t) => (
            <Card key={t.author} className="flex flex-col">
              <p className="flex-1 text-sm leading-6 text-brand-800">
                <span aria-hidden="true" className="font-display text-2xl text-accent-400">
                  &ldquo;
                </span>
                {t.quote}
              </p>
              <div className="mt-4 border-t border-brand-200 pt-4">
                <p className="text-sm font-semibold text-brand-900">{t.author}</p>
                <p className="text-xs text-brand-500">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
