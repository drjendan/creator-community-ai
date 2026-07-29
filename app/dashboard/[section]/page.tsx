import { notFound } from "next/navigation";
import { MembershipPlanManager } from "@/components/dashboard/MembershipPlanManager";
import { requireTenantFeature } from "@/lib/feature-entitlements";

export default async function DashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "memberships" && await requireTenantFeature("memberships")) return <MembershipPlanManager />;
  notFound();
}

