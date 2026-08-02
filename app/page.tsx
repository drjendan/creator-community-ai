import Link from "next/link";
import {
  ArrowRight, BarChart3, Bot, CalendarDays, Check, CircleDollarSign,
  Clapperboard, GraduationCap, MessageSquareText, Sparkles, UsersRound
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { CapabilityCard } from "@/components/marketing/CapabilityCard";
import { PricingCard } from "@/components/marketing/PricingCard";
import { PublicNav } from "@/components/marketing/PublicNav";
import { Button, Card, Container, SectionHeading } from "@/components/ui";
import { capabilityCards, plans, solutions } from "@/lib/marketing";

const featureStrip = [
  [Clapperboard, "All Your Content", "Podcasts, videos, articles, courses, and more."],
  [UsersRound, "Engage Your Community", "Discussions, groups, comments, and direct messaging."],
  [Sparkles, "AI-Powered Tools", "Create, summarize, recommend, and save time."],
  [CircleDollarSign, "Monetize & Grow", "Memberships, courses, events, and digital products."],
  [BarChart3, "Insights That Matter", "Understand your audience and make data-driven decisions."]
] as const;

const capabilityIcons = [Clapperboard, GraduationCap, MessageSquareText, Clapperboard, CalendarDays, CircleDollarSign, Sparkles, Bot, BarChart3, UsersRound];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[680px] lg:translate-x-5">
      <div className="absolute -inset-12 rounded-full bg-accent-600/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-pop">
        <div className="flex items-center gap-2 border-b border-brand-200 bg-brand-50 px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" /><span className="h-2.5 w-2.5 rounded-full bg-warning" /><span className="h-2.5 w-2.5 rounded-full bg-success" />
        </div>
        <div className="grid min-h-[470px] grid-cols-[112px_1fr] bg-brand-50 sm:grid-cols-[145px_1fr]">
          <aside className="border-r border-brand-200 bg-white p-3 sm:p-5">
            <BrandMark compact />
            <div className="mt-7 space-y-2 text-[10px] font-semibold text-brand-500 sm:text-xs">
              {["Dashboard", "Content", "Courses", "Community", "Events", "AI Assistant", "Analytics", "Settings"].map((item, index) => (
                <p key={item} className={index === 0 ? "rounded-lg bg-accent-100 px-2 py-2 text-accent-700" : "px-2 py-1.5"}>{item}</p>
              ))}
            </div>
          </aside>
          <div className="min-w-0 p-4 sm:p-6">
            <p className="font-display text-lg font-extrabold text-brand-900">Welcome to UpNexx</p>
            <p className="text-[10px] text-brand-500 sm:text-xs">Let&apos;s get your platform ready.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Courses", "Members", "Events"].map((label) => (
                <div key={label} className="rounded-lg border border-brand-200 bg-white p-2.5 shadow-card sm:p-3">
                  <p className="truncate text-[9px] text-brand-500">{label}</p><p className="mt-1 text-[9px] font-bold text-brand-700 sm:text-[10px]">No data yet</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[10px] font-bold text-brand-800 sm:text-xs">Getting Started</p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-card">
              <span className="upnexx-gradient grid h-10 w-10 place-items-center rounded-lg text-white"><GraduationCap className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-brand-900 sm:text-xs">Complete your organization profile</p><p className="text-[9px] text-brand-500">Add your brand, content, and team.</p></div>
              <span className="rounded-md bg-accent-100 px-2 py-1 text-[9px] font-bold text-accent-700">Set up</span>
            </div>
            <p className="mt-5 text-[10px] font-bold text-brand-800 sm:text-xs">Upcoming Events</p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-900 text-highlight-300"><CalendarDays className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-brand-900 sm:text-xs">No upcoming events</p><p className="text-[9px] text-brand-500">Create an event when you&apos;re ready.</p></div>
              <span className="rounded-md bg-accent-100 px-2 py-1 text-[9px] font-bold text-accent-700">Create</span>
            </div>
            <div className="mt-5 rounded-xl border border-brand-200 bg-white p-3 shadow-card"><p className="text-[10px] font-bold text-brand-800">Recent Activity</p><p className="mt-2 text-[9px] text-brand-500">No recent activity.</p></div>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 top-8 w-56 rounded-xl border border-accent-400/50 bg-brand-800/95 p-4 text-white shadow-pop backdrop-blur sm:-right-12 sm:w-64">
        <p className="text-sm font-bold">AI Studio</p><p className="text-xs text-brand-200">Ready to create AI-powered content?</p>
        <div className="mt-3 text-[10px] text-brand-200">Generated content appears only after you provide an approved source.</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main>
        <section className="upnexx-hero relative overflow-hidden text-white">
          <div className="pointer-events-none absolute inset-0 grid-fade opacity-30" />
          <Container className="relative grid gap-16 pb-20 pt-16 lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:pb-24 lg:pt-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.14em] text-highlight-300">The Intelligent Content, Learning &amp; Community Platform</p>
              <h1 className="mt-7 max-w-2xl font-display text-5xl font-extrabold leading-[1.02] tracking-[-.045em] md:text-6xl">
                Transform your expertise into <span className="upnexx-gradient-text">engagement, learning,</span> and <span className="upnexx-gradient-text">revenue.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-brand-200">Empower your members with personalized learning, AI-powered recommendations, vibrant communities, and experiences that inspire them to return again and again.</p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Button href="/request-demo" size="lg">Start Free Trial <ArrowRight className="h-4 w-4" /></Button>
                <Button href="/request-demo" variant="secondary" size="lg" className="border-accent-500 text-white hover:bg-accent-600/15">Book a Demo</Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-brand-100">
                {["No credit card required", "Cancel anytime", "Built for creators, educators & organizations"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 rounded-full border border-highlight-400 p-0.5 text-highlight-300" />{item}</span>)}
              </div>
            </div>
            <ProductPreview />
          </Container>
          <Container className="relative grid gap-6 border-t border-white/15 py-8 sm:grid-cols-2 lg:grid-cols-5">
            {featureStrip.map(([Icon, title, body]) => <div key={title} className="flex gap-3"><Icon className="mt-0.5 h-7 w-7 shrink-0 text-accent-400" /><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-brand-300">{body}</p></div></div>)}
          </Container>
        </section>

        <section id="features" className="bg-brand-50 py-20 lg:py-24">
          <Container>
            <SectionHeading eyebrow="One intelligent platform" title="Everything your members need to learn, connect, and grow." subtitle="Bring your expertise, content, community, and revenue streams together in one polished experience." align="center" />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {capabilityCards.map(([title, description], index) => <CapabilityCard key={title} title={title} description={description} icon={capabilityIcons[index]} />)}
            </div>
          </Container>
        </section>

        <section id="solutions" className="border-y border-brand-200 bg-white py-20 lg:py-24">
          <Container>
            <SectionHeading eyebrow="Built for expertise-led brands" title="Create an experience people return to." subtitle="UpNexx adapts to your content, audience, and business model." />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {solutions.map(([title, body], index) => { const Icon = capabilityIcons[index]; return <Card key={title} className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-700"><Icon className="h-5 w-5" /></span><div><h3 className="font-display text-lg font-bold text-brand-900">{title}</h3><p className="mt-2 text-sm leading-6 text-brand-500">{body}</p></div></Card>; })}
            </div>
          </Container>
        </section>

        <section id="pricing" className="bg-brand-50 py-20 lg:py-24">
          <Container>
            <SectionHeading eyebrow="Straightforward pricing" title="Choose the platform that fits your next stage." subtitle="Start focused, then expand your learning, community, membership, and AI capabilities as you grow." align="center" />
            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => <PricingCard key={plan.id} plan={plan} />)}</div>
          </Container>
        </section>

        <section className="bg-white py-20 lg:py-24">
          <Container>
            <div className="upnexx-hero rounded-3xl px-7 py-14 text-center text-white shadow-pop md:px-14">
              <h2 className="font-display text-3xl font-extrabold md:text-5xl">Turn what you know into what comes next.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-brand-200">Build a branded experience where your audience can watch, learn, connect, and become committed members.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3"><Button href="/request-demo">Start Free Trial</Button><Button href="/request-demo" variant="secondary" className="border-accent-500 text-white hover:bg-accent-600/15">Book a Demo</Button></div>
            </div>
          </Container>
        </section>
      </main>
      <footer id="resources" className="bg-brand-950 py-14 text-brand-300">
        <Container className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div><BrandMark inverse /><p className="mt-5 max-w-xs text-sm leading-6">Empowering creators. Enriching communities. Driving growth.</p></div>
          {[{ heading: "Platform", links: [["Features", "#features"], ["Solutions", "#solutions"]] }, { heading: "Company", links: [["Pricing", "#pricing"], ["Resources", "#resources"]] }, { heading: "Account", links: [["Log In", "/login"], ["Create Account", "/signup"], ["Book a Demo", "/request-demo"]] }].map(({ heading, links }) => <div key={heading}><p className="font-display font-bold text-white">{heading}</p><div className="mt-4 space-y-3">{links.map(([label, href]) => <Link key={label} href={href} className="block text-sm hover:text-highlight-300">{label}</Link>)}</div></div>)}
        </Container>
        <Container className="flex flex-col items-center justify-between gap-4 pt-6 text-center text-xs text-brand-400 sm:flex-row"><span>Powered by Nexx Jenn Technologies</span><span className="flex flex-wrap justify-center gap-4"><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/cookies" className="hover:text-white">Cookies</Link><Link href="/acceptable-use" className="hover:text-white">Acceptable Use</Link></span></Container>
      </footer>
    </>
  );
}
