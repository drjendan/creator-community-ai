import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getAccessibleCommunitySpaces } from "@/lib/content/member-community";

export default async function CommunityPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const spaces = await getAccessibleCommunitySpaces(slug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Member community" title="Community" subtitle="Discussion spaces available to your account appear here." />
        {spaces.length === 0 ? (
          <EmptyState className="mt-10" title="No community activity yet." description="Community spaces and conversations will appear after they are created and made available to you." icon={MessageSquareText} />
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {spaces.map((space) => <Card key={space.id}><MessageSquareText className="h-5 w-5 text-accent-600" /><h2 className="mt-4 font-display text-xl font-bold text-brand-900">{space.name}</h2><p className="mt-3 text-sm leading-6 text-brand-600">{space.description || "No description has been added."}</p></Card>)}
          </div>
        )}
      </Container>
    </main>
  );
}
