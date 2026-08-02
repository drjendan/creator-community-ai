import { BookOpen, CalendarDays, ExternalLink, FileText, Library, Mic2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getUnifiedMemberLibrary } from "@/lib/content/unified-library";

const labels = { episodes: ["Episode", Mic2], courses: ["Course", BookOpen], resources: ["Resource", FileText], events: ["Event", CalendarDays] } as const;

export default async function MemberContentLibraryPage({ params, searchParams }: { params: Promise<{ "tenant-slug": string }>; searchParams: Promise<{ type?: string; category?: string; q?: string }> }) {
  const { "tenant-slug": slug } = await params;
  const filters = await searchParams;
  const data = await getUnifiedMemberLibrary(slug);
  if (!data) notFound();
  const query = (filters.q ?? "").trim().toLowerCase();
  const items = data.items.filter((item) => (!filters.type || filters.type === "all" || item.contentType === filters.type) && (!filters.category || filters.category === "all" || item.categoryIds.includes(filters.category)) && (!query || `${item.title} ${item.description}`.toLowerCase().includes(query)));
  return <main className="py-16"><Container>
    <SectionHeading eyebrow="Content Library" title="Explore everything in one place." subtitle={`Browse the published episodes, courses, resources, and events available from ${data.tenant.name}.`} />
    <form className="mt-8 grid gap-3 rounded-2xl border border-brand-200 bg-white p-4 md:grid-cols-[1fr_180px_220px_auto]" method="get">
      <label className="text-sm font-semibold text-brand-700">Search<input name="q" defaultValue={filters.q} className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2" placeholder="Search the library" /></label>
      <label className="text-sm font-semibold text-brand-700">Type<select name="type" defaultValue={filters.type ?? "all"} className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"><option value="all">All types</option><option value="episodes">Episodes</option><option value="courses">Courses</option><option value="resources">Resources</option><option value="events">Events</option></select></label>
      <label className="text-sm font-semibold text-brand-700">Category<select name="category" defaultValue={filters.category ?? "all"} className="mt-1 block w-full rounded-lg border border-brand-200 px-3 py-2"><option value="all">All categories</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <button className="self-end rounded-lg bg-accent-600 px-5 py-2.5 text-sm font-bold text-white" type="submit">Filter</button>
    </form>
    {!data.consolidationInstalled && <p className="mt-4 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-brand-800">Categories will appear after migration 0021 is applied. Published content remains available.</p>}
    {items.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => { const [label, Icon] = labels[item.contentType]; return <Card key={`${item.contentType}-${item.id}`} className="flex min-h-64 flex-col"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent-700"><Icon className="h-4 w-4" />{label}</span><span className="text-xs font-semibold capitalize text-brand-500">{item.accessLevel}</span></div><h2 className="mt-5 font-display text-xl font-bold text-brand-900">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-600">{item.description || `Published ${label.toLowerCase()}`}</p><div className="mt-4 flex flex-wrap gap-2">{item.categoryIds.map((id) => <span key={id} className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-800">{data.categories.find((category) => category.id === id)?.name ?? "Category"}</span>)}</div><a href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-accent-700">Open {label.toLowerCase()}{item.external && <ExternalLink className="h-4 w-4" />}</a></Card>; })}</div> : <div className="mt-8 rounded-xl border border-brand-200 bg-white p-10 text-center"><Library className="mx-auto h-10 w-10 text-brand-300" /><p className="mt-3 font-display text-xl font-bold text-brand-900">No published content matches these filters.</p></div>}
  </Container></main>;
}
