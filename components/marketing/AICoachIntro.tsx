import { Sparkles } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

export function AICoachIntro({ aiCoach }: Pick<LandingContent, "aiCoach">) {
  return (
    <section className="border-t border-brand-200/70 py-16">
      <Container className="grid items-center gap-10 lg:grid-cols-2">
        <SectionHeading eyebrow={aiCoach.eyebrow} title={aiCoach.title} subtitle={aiCoach.description} />
        <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-card" aria-hidden="true">
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-900 px-4 py-2.5 text-sm text-white">
              {aiCoach.question}
            </p>
          </div>
          <div className="mt-3 flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-brand-50 px-4 py-3">
              <p className="text-sm leading-6 text-brand-900">{aiCoach.answer}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent-600">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Answer cites this community&apos;s content
              </p>
            </div>
          </div>
          <p className="mt-5 border-t border-brand-200 pt-4 text-xs leading-5 text-brand-500">
            {aiCoach.disclaimer}
          </p>
        </div>
      </Container>
    </section>
  );
}
