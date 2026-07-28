import { MembershipCard } from "@/components/content/ContentCards";
import { Container, SectionHeading } from "@/components/ui";
import { membershipPlans } from "@/lib/mock/podcastos";
export default function MembershipPage() { return <main className="py-16"><Container><SectionHeading eyebrow="Membership" title="Choose how you want to learn and lead." subtitle="Start free or unlock guided learning, member events, and AI-powered support." align="center" /><div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">{membershipPlans.map((plan) => <MembershipCard key={plan.name} plan={plan} />)}</div></Container></main>; }
