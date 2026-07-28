import { ArrowRight, Play, Sparkles } from "lucide-react";
import { EpisodeCard } from "@/components/content/ContentCards";
import { Button, Card, Container, SectionHeading } from "@/components/ui";
import { demoEpisodes, demoTenant } from "@/lib/mock/podcastos";

export default function DemoTenantPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-accent-800/50 to-transparent" />
        <Container className="relative grid gap-12 py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-highlight-400">AI at Work podcast & community</p><h1 className="mt-5 font-display text-5xl font-extrabold leading-tight">{demoTenant.tagline}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-brand-100">{demoTenant.description}</p><div className="mt-8 flex gap-3"><Button href="/demo/ai-at-work/episodes"><Play className="h-4 w-4 fill-current" /> Explore episodes</Button><Button href="/demo/ai-at-work/membership" variant="secondary" className="border-white/40 text-white hover:bg-white/10">Join the community</Button></div></div>
          <Card className="border-white/10 bg-white/10 text-white backdrop-blur"><p className="text-xs font-bold uppercase tracking-wide text-highlight-400">Latest episode</p><h2 className="mt-4 font-display text-2xl font-bold">{demoEpisodes[0].title}</h2><p className="mt-4 text-sm leading-6 text-brand-100">{demoEpisodes[0].description}</p><button className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-accent-700"><Play className="h-5 w-5 fill-current" /></button></Card>
        </Container>
      </section>
      <section className="py-16"><Container><SectionHeading eyebrow="Listen and learn" title="Practical AI conversations for modern leaders." /><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{demoEpisodes.slice(0, 3).map((episode) => <EpisodeCard key={episode.id} episode={episode} />)}</div><Button href="/demo/ai-at-work/episodes" variant="secondary" className="mt-8">View all episodes <ArrowRight className="h-4 w-4" /></Button></Container></section>
      <section className="border-y border-brand-200 bg-white py-16"><Container className="grid gap-7 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-accent-700">Member learning path</p><h2 className="mt-3 font-display text-3xl font-extrabold text-brand-900">Build AI confidence with a trusted community.</h2><p className="mt-4 leading-7 text-brand-600">Move from headlines to informed action through guided courses, live briefings, peer discussion, and a source-grounded AI Coach.</p><Button href="/demo/ai-at-work/membership" className="mt-7">Compare memberships</Button></div><Card className="bg-accent-50"><Sparkles className="h-7 w-7 text-accent-600" /><h3 className="mt-4 font-display text-2xl font-bold text-brand-900">Ask the AI at Work Coach</h3><p className="mt-3 text-brand-600">“What should a 20-person company consider before adopting AI agents?”</p><p className="mt-5 rounded-xl bg-white p-4 text-sm leading-6 text-brand-700">Start with one bounded workflow, name an accountable owner, document human review, and establish the data that an agent may access.</p></Card></Container></section>
    </main>
  );
}

