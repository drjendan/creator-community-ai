import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getAccessibleCommunitySpaces } from "@/lib/content/member-community";
import { notFound } from "next/navigation";
import { tenantHasFeature } from "@/lib/tenant-site";
import Link from "next/link";

export default async function CommunityPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  if (!(await tenantHasFeature(slug, "community"))) notFound();
  const spaces = await getAccessibleCommunitySpaces(slug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Member community" title="Community" subtitle="Discussion spaces available to your account appear here." />
        {spaces.length === 0 ? (
          <EmptyState className="mt-10" title="No discussions have been started yet." description="Community spaces and conversations will appear after they are created and made available to you. Check back soon." actionLabel="Return Home" actionHref={`/demo/${slug}`} icon={MessageSquareText} />
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {spaces.map((space) => <Link key={space.id} href={`/demo/${slug}/community/${space.id}`}><Card className="h-full transition hover:border-accent-400"><MessageSquareText className="h-5 w-5 text-accent-600" />{space.featured && <p className="mt-3 text-xs font-bold uppercase text-accent-700">Featured space</p>}<h2 className="mt-4 font-display text-xl font-bold text-brand-900">{space.name}</h2><p className="mt-3 text-sm leading-6 text-brand-600">{space.description || "No description has been added."}</p><p className="mt-4 text-sm font-bold text-accent-700">Open discussions →</p></Card></Link>)}
          </div>
        )}
      </Container>
    </main>
  );
}
