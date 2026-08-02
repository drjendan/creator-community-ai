/* eslint-disable @next/next/no-img-element */
import { BookOpen, Clock3 } from "lucide-react";
import { Button, Card, Container, SectionHeading } from "@/components/ui";
import { EmptyState } from "@/components/feedback/EmptyState";
import { getPublishedCourses } from "@/lib/content/member-library";
import { notFound } from "next/navigation";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function CoursesPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": tenantSlug } = await params;
  if (!(await tenantHasFeature(tenantSlug, "courses"))) notFound();
  const courses = await getPublishedCourses(tenantSlug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Learning center" title="Build practical skills." subtitle="Structured learning experiences published by your creator." />
        {courses.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <Card key={course.id} className="flex min-h-80 flex-col">{course.cover_image_url ? <div className="overflow-hidden rounded-xl bg-brand-100"><img src={course.cover_image_url} alt="" className="aspect-video w-full object-cover" /></div> : <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-accent-700 to-highlight-500 text-white"><div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" /><BookOpen className="h-12 w-12" /><span className="absolute bottom-3 left-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white/85">Learning center</span></div>}<p className="mt-5 text-xs font-bold uppercase tracking-wide text-accent-700">{course.access_level} · {course.difficulty?.replace("_", " ")}</p><h2 className="mt-2 font-display text-xl font-bold text-brand-900">{course.title}</h2>{course.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-600">{course.description}</p>}<div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-brand-500"><span>{course.module_count} modules</span><span>{course.lesson_count} lessons</span>{course.estimated_duration_minutes && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{course.estimated_duration_minutes} min</span>}</div><div className="mt-auto pt-5"><Button href={`/demo/${tenantSlug}/courses/${course.id}`} size="sm">View course</Button></div></Card>)}</div> : <EmptyState className="mt-10" title="No published courses yet." description="Published courses will appear here after the organization creates them. Check back soon." actionLabel="Return Home" actionHref={`/demo/${tenantSlug}`} icon={BookOpen} />}
      </Container>
    </main>
  );
}

