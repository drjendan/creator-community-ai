/* eslint-disable @next/next/no-img-element */
import { BookOpen, ExternalLink, FileText } from "lucide-react";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getPublishedCourses } from "@/lib/content/member-library";

export default async function CoursesPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params;
  const courses = await getPublishedCourses(tenantSlug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Learning center" title="Build practical skills." subtitle="Structured learning experiences published by your creator." />
        {courses.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <Card key={course.id} className="flex min-h-80 flex-col">{course.cover_image_url ? <div className="overflow-hidden rounded-xl bg-brand-100">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={course.cover_image_url} alt="" className="aspect-video w-full object-cover" /></div> : <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-accent-700 to-highlight-500 text-white"><div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" /><BookOpen className="h-12 w-12" /><span className="absolute bottom-3 left-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white/85">Learning center</span></div>}<p className="mt-5 text-xs font-bold uppercase tracking-wide text-accent-700">{course.access_level} course</p><h2 className="mt-2 font-display text-xl font-bold text-brand-900">{course.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-600">{course.description || "Open this course to begin learning."}</p><div className="mt-auto pt-5">{course.content_url ? <a href={course.content_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-bold text-white"><FileText className="h-4 w-4" />Open course file<ExternalLink className="h-4 w-4" /></a> : <span className="text-sm text-brand-400">Course content is being prepared.</span>}</div></Card>)}</div> : <p className="mt-10 rounded-xl border border-brand-200 bg-white p-10 text-center text-brand-500">No courses have been published yet.</p>}
      </Container>
    </main>
  );
}

