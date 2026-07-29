/* eslint-disable @next/next/no-img-element */
import { Download, ExternalLink, FileText } from "lucide-react";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getPublishedResources } from "@/lib/content/member-library";
import { notFound } from "next/navigation";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function ResourcesPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params;
  if (!(await tenantHasFeature(tenantSlug, "resources"))) notFound();
  const resources = await getPublishedResources(tenantSlug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Resource library" title="Tools, guides, and downloads." subtitle="Open the practical resources published for this community." />
        {resources.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <Card key={resource.id} className="flex min-h-64 flex-col">{resource.cover_image_url ? <div className="overflow-hidden rounded-xl bg-brand-100">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={resource.cover_image_url} alt="" className="aspect-video w-full object-cover" /></div> : <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-accent-700 to-highlight-500 text-white"><div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" /><FileText className="h-12 w-12" /><span className="absolute bottom-3 left-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white/85">Resource library</span></div>}<p className="mt-5 text-xs font-bold uppercase tracking-wide text-accent-700">{resource.resource_type}</p><h2 className="mt-2 font-display text-xl font-bold text-brand-900">{resource.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-600">{resource.description || "Member resource"}</p><a href={resource.url} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-accent-700"><Download className="h-4 w-4" />Open resource<ExternalLink className="h-4 w-4" /></a></Card>)}</div> : <p className="mt-10 rounded-xl border border-brand-200 bg-white p-10 text-center text-brand-500">No resources have been published yet.</p>}
      </Container>
    </main>
  );
}

