import { Button, Container } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

const waveform = [10, 18, 26, 14, 30, 22, 34, 16, 28, 12, 24, 32, 18, 26, 14, 22, 30, 16, 24, 12];

export function Hero({ hero }: Pick<LandingContent, "hero">) {
  return (
    <section className="border-b border-brand-200/70">
      <Container className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
            {hero.eyebrow}
          </p>
          <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-[1.1] text-brand-900 md:text-5xl">
            {hero.title} <span className="text-accent-600">{hero.emphasis}</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-brand-700 md:text-lg md:leading-8">
            {hero.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={hero.primary.href} size="lg">
              {hero.primary.label}
            </Button>
            <Button href={hero.secondary.href} variant="secondary" size="lg">
              {hero.secondary.label}
            </Button>
          </div>
        </div>

        {/* Product mock instead of a stock photo (design system, restrained visuals). */}
        <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
          <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-pop">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-600">
                  {hero.nowPlaying.label}
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-brand-900">
                  {hero.nowPlaying.episodeTitle}
                </p>
              </div>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                {hero.nowPlaying.duration}
              </span>
            </div>
            <div className="mt-5 flex h-10 items-end gap-[3px]">
              {waveform.map((h, i) => (
                <span
                  key={i}
                  className={`w-full rounded-full ${i < 8 ? "bg-accent-500" : "bg-brand-200"}`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-brand-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
                AI Coach
              </p>
              <p className="mt-2 text-sm leading-6 text-brand-900">{hero.nowPlaying.coachNote}</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
