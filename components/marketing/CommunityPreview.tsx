import { Card, Container, SectionHeading } from "@/components/ui";
import type { LandingContent } from "@/lib/landing-content";

export function CommunityPreview({ community }: Pick<LandingContent, "community">) {
  return (
    <section id="community" className="border-t border-brand-200/70 py-16">
      <Container className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <SectionHeading
          eyebrow={community.eyebrow}
          title={community.title}
          subtitle={community.description}
        />
        <div className="space-y-4" aria-hidden="true">
          {community.posts.map((post) => (
            <Card key={post.author} className="flex gap-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white">
                {post.initials}
              </span>
              <div>
                <p className="text-sm">
                  <span className="font-semibold text-brand-900">{post.author}</span>{" "}
                  <span className="text-brand-500">{post.meta}</span>
                </p>
                <p className="mt-1.5 text-sm leading-6 text-brand-700">{post.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
