import { Header } from "@/components/marketing/Header";
import { Hero } from "@/components/marketing/Hero";
import { FeaturedContent } from "@/components/marketing/FeaturedContent";
import { CommunityPreview } from "@/components/marketing/CommunityPreview";
import { UpcomingEvent } from "@/components/marketing/UpcomingEvent";
import { AICoachIntro } from "@/components/marketing/AICoachIntro";
import { Membership } from "@/components/marketing/Membership";
import { SocialProof } from "@/components/marketing/SocialProof";
import { Footer } from "@/components/marketing/Footer";
import { placeholderLanding } from "@/lib/landing-content";

// TEMPORARY: content comes from `placeholderLanding`. In Chunk 6 this is
// replaced by tenant/branding data resolved from Supabase for the current slug.
export default function HomePage() {
  const c = placeholderLanding;
  return (
    <>
      <Header tenant={c.tenant} nav={c.nav} />
      <main>
        <Hero hero={c.hero} />
        <FeaturedContent featured={c.featured} />
        <CommunityPreview community={c.community} />
        <UpcomingEvent event={c.event} />
        <AICoachIntro aiCoach={c.aiCoach} />
        <Membership membership={c.membership} />
        <SocialProof proof={c.proof} />
      </main>
      <Footer tenant={c.tenant} footer={c.footer} />
    </>
  );
}
