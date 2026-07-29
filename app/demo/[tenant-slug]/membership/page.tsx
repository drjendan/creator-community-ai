import { Users } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card, Container, SectionHeading } from "@/components/ui";
import { getPublicMembershipPlans } from "@/lib/content/member-community";
import { notFound } from "next/navigation";
import { tenantHasFeature } from "@/lib/tenant-site";

export default async function MembershipPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  if (!(await tenantHasFeature(slug, "memberships"))) notFound();
  const plans = await getPublicMembershipPlans(slug);
  return (
    <main className="py-16">
      <Container>
        <SectionHeading eyebrow="Membership" title="Membership plans" subtitle="Available membership options are loaded directly from this organization." align="center" />
        {plans.length === 0 ? (
          <EmptyState className="mx-auto mt-12 max-w-2xl" title="No membership plans available yet." description="Public membership plans will appear here after the organization creates them." icon={Users} />
        ) : (
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {plans.map((plan) => <Card key={plan.id}><p className="text-xs font-bold uppercase tracking-wide text-accent-700">{plan.plan_type}</p><h2 className="mt-3 font-display text-2xl font-bold text-brand-900">{plan.name}</h2><p className="mt-3 text-sm leading-6 text-brand-600">{plan.description || "No description has been added."}</p><p className="mt-5 font-display text-2xl font-extrabold text-brand-900">{plan.plan_type === "free" ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency || "USD" }).format(Number(plan.price_monthly))}<span className="text-sm font-medium text-brand-500">{plan.plan_type === "paid" ? "/month" : ""}</span></p></Card>)}
          </div>
        )}
      </Container>
    </main>
  );
}
