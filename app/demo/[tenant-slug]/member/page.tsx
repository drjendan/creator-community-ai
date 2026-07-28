import { BookOpen, Bot, CalendarDays, Headphones, MessageSquareText, TrendingUp } from "lucide-react";
import { AppDashboardShell } from "@/components/dashboard/AppDashboardShell";
import { Card, CardTitle } from "@/components/ui";
import { demoEpisodes, demoTenant, memberNavItems } from "@/lib/mock/podcastos";

export default function MemberDashboardPage() {
  return (
    <AppDashboardShell title={demoTenant.name} subtitle="Member experience" nav={memberNavItems} userLabel="Demo Member">
      <div className="space-y-8">
        <div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Welcome back</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Continue your AI learning journey.</h1><p className="mt-2 text-brand-600">Your AI Insider membership is active.</p></div>
        <section className="grid gap-4 md:grid-cols-3">
          {[["Episodes played", "18", Headphones], ["Courses in progress", "2", BookOpen], ["Community replies", "12", MessageSquareText]].map(([label, value, Icon]) => <Card key={String(label)}><Icon className="h-5 w-5 text-accent-600" /><p className="mt-4 text-sm font-semibold text-brand-500">{String(label)}</p><p className="mt-1 font-display text-3xl font-extrabold text-brand-900">{String(value)}</p></Card>)}
        </section>
        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card><CardTitle>Continue listening</CardTitle><div className="mt-5 space-y-3">{demoEpisodes.slice(0, 3).map((episode, index) => <div key={episode.id} className="rounded-xl border border-brand-100 p-4"><div className="flex items-center justify-between gap-4"><p className="font-bold text-brand-900">{episode.title}</p><span className="text-xs font-semibold text-brand-500">{[72, 46, 21][index]}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100"><div className="h-full rounded-full bg-accent-500" style={{ width: `${[72, 46, 21][index]}%` }} /></div></div>)}</div></Card>
          <Card id="ai-coach" className="bg-brand-900 text-white"><Bot className="h-7 w-7 text-highlight-400" /><h2 className="mt-4 font-display text-2xl font-bold">AI at Work Coach</h2><p className="mt-3 text-sm leading-6 text-brand-100">Ask questions grounded in the podcast, course, and resource library.</p><button className="mt-6 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-brand-900">Start a conversation</button></Card>
        </section>
        <section className="grid gap-5 md:grid-cols-2"><Card><CalendarDays className="h-5 w-5 text-accent-600" /><h2 className="mt-4 font-display text-xl font-bold text-brand-900">Next live briefing</h2><p className="mt-2 text-brand-600">AI Leadership Briefing · August 12</p></Card><Card><TrendingUp className="h-5 w-5 text-success" /><h2 className="mt-4 font-display text-xl font-bold text-brand-900">Weekly progress</h2><p className="mt-2 text-brand-600">You completed 3 learning activities this week.</p></Card></section>
      </div>
    </AppDashboardShell>
  );
}

