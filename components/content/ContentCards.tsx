import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Play } from "lucide-react";
import { Card } from "@/components/ui";

export function EpisodeCard({ episode, baseHref = "/demo/ai-at-work/episodes" }: { episode: { id: string; title: string; description: string; duration: string; category: string }; baseHref?: string }) {
  return <Card className="flex h-full flex-col"><div className="flex items-center justify-between"><span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-700">{episode.category}</span><span className="flex items-center gap-1 text-xs text-brand-500"><Clock3 className="h-3.5 w-3.5" />{episode.duration}</span></div><h3 className="mt-5 font-display text-xl font-bold text-brand-900">{episode.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-brand-600">{episode.description}</p><Link href={`${baseHref}/${episode.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent-700"><Play className="h-4 w-4 fill-current" /> Watch episode</Link></Card>;
}
export function CourseCard({ title, lessons, level }: { title: string; lessons: number; level: string }) {
  return <Card><span className="text-xs font-bold uppercase tracking-wide text-accent-700">{level}</span><h3 className="mt-3 font-display text-xl font-bold text-brand-900">{title}</h3><p className="mt-3 text-sm text-brand-600">{lessons} practical lessons</p><Link href="#" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-accent-700">View course <ArrowRight className="h-4 w-4" /></Link></Card>;
}
export function EventCard({ title, date, format }: { title: string; date: string; format: string }) {
  return <Card><CalendarDays className="h-6 w-6 text-accent-600" /><h3 className="mt-4 font-display text-xl font-bold text-brand-900">{title}</h3><p className="mt-2 text-sm text-brand-600">{date} · {format}</p><Link href="#" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-accent-700">Reserve a seat <ArrowRight className="h-4 w-4" /></Link></Card>;
}
export function MembershipCard({ plan }: { plan: { name: string; price: string; description: string } }) {
  return <Card className="flex h-full flex-col"><h3 className="font-display text-xl font-bold text-brand-900">{plan.name}</h3><p className="mt-2 font-display text-2xl font-extrabold text-accent-700">{plan.price}</p><p className="mt-4 flex-1 text-sm leading-6 text-brand-600">{plan.description}</p><button className="mt-6 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-bold text-white">Choose {plan.name}</button></Card>;
}
