import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";
import { MembershipPlanManager } from "@/components/dashboard/MembershipPlanManager";

const modules: Record<string, { title: string; description: string }> = {
  branding: { title: "Branding", description: "Manage tenant colors, logos, imagery, and member-facing language." },
  team: { title: "Team", description: "Invite administrators and assign tenant-scoped roles." },
  billing: { title: "Billing", description: "Review the tenant's UpNexx subscription and billing status." }
};

export default async function DashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "memberships") return <MembershipPlanManager />;
  const selectedModule = modules[section];
  if (!selectedModule) notFound();
  return <ModulePlaceholder {...selectedModule} />;
}

