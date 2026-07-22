import { Check } from "lucide-react";
import { Button, Container, SectionHeading, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LandingContent } from "@/lib/landing-content";

export function Membership({ membership }: Pick<LandingContent, "membership">) {
  return (
    <section id="membership" className="bg-white py-16">
      <Container>
        <SectionHeading
          eyebrow={membership.eyebrow}
          title={membership.title}
          subtitle={membership.subtitle}
          align="center"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {membership.plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border bg-white p-6",
                plan.featured
                  ? "border-accent-400 shadow-lift ring-1 ring-accent-200"
                  : "border-brand-200 shadow-card"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-brand-900">{plan.name}</h3>
                {plan.featured && <Badge tone="accent">Most popular</Badge>}
              </div>
              <p className="mt-3">
                <span className="font-display text-4xl font-semibold text-brand-900">{plan.price}</span>
                <span className="text-sm font-medium text-brand-500">{plan.cadence}</span>
              </p>
              <p className="mt-2 text-sm text-brand-700">{plan.description}</p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-brand-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href="/join"
                variant={plan.featured ? "primary" : "secondary"}
                className="mt-6 w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
