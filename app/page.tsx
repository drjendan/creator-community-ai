import { Mic, GraduationCap, MessagesSquare, CalendarDays, Sparkles } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Podcast library",
    copy: "Every episode organized, searchable, and playable inside your own branded space."
  },
  {
    icon: GraduationCap,
    title: "Courses and training",
    copy: "Turn recordings into structured lessons members can work through at their own pace."
  },
  {
    icon: MessagesSquare,
    title: "Community discussions",
    copy: "Member conversations live next to your content instead of on someone else's feed."
  },
  {
    icon: CalendarDays,
    title: "Events and resources",
    copy: "Publish workshops, downloads, and live sessions with RSVPs built in."
  },
  {
    icon: Sparkles,
    title: "Tenant-branded AI Coach",
    copy: "An assistant grounded only in your episodes, courses, and notes — in your voice."
  }
];

const waveform = [10, 18, 26, 14, 30, 22, 34, 16, 28, 12, 24, 32, 18, 26, 14, 22, 30, 16, 24, 12];

export default function HomePage() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <p className="font-display text-lg font-semibold text-brand-900">Creator Community AI</p>
        <nav className="hidden items-center gap-6 text-sm font-medium text-brand-700 sm:flex">
          <a href="#features" className="hover:text-brand-900">What&apos;s inside</a>
          <a
            href="#"
            className="rounded-full bg-brand-900 px-4 py-2 text-white transition-colors hover:bg-brand-700"
          >
            Explore the demo
          </a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
            White-label community platform
          </p>
          <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.1] text-brand-900 md:text-5xl">
            Turn your content into a thriving learning community.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-brand-700 md:text-lg md:leading-8">
            A platform for podcasters, coaches, counselors, and thought leaders to host content, engage
            members, and offer an AI Coach grounded in their own knowledge.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
              Explore the demo
            </button>
            <button className="rounded-full border border-brand-900/30 px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-900">
              Admin preview
            </button>
          </div>
        </div>

        {/* Product mock instead of a stock photo */}
        <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
          <div className="rounded-3xl border border-brand-200 bg-white p-6 shadow-[0_24px_60px_-24px_rgba(36,27,20,0.25)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-600">
                  Now playing
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-brand-900">
                  Healing For Your Soul — Ep. 42
                </p>
              </div>
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                38:12
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
            <div className="mt-6 rounded-2xl bg-brand-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
                AI Coach
              </p>
              <p className="mt-2 text-sm leading-6 text-brand-900">
                &ldquo;In episode 42 you talked about boundaries in caregiving. Here are the three practices
                you recommended, with links to the full segments.&rdquo;
              </p>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-4 rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-lg">
            <p className="text-xs font-medium text-brand-700">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent-500" />
              Live workshop · Thu 7 PM · 64 going
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-brand-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
            MVP foundation
          </p>
          <h2 className="mt-2 max-w-lg font-display text-2xl font-semibold text-brand-900 md:text-3xl">
            Everything a creator community needs on day one.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
                <Icon className="h-5 w-5 text-accent-600" strokeWidth={1.75} aria-hidden="true" />
                <p className="mt-4 font-semibold text-brand-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-brand-700">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-brand-500">
        <p>Creator Community AI</p>
        <p>Built for podcasters, coaches, and thought leaders.</p>
      </footer>
    </main>
  );
}
