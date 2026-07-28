import { notFound } from "next/navigation";
import { Settings, UserPlus, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { MembershipPlanManager } from "@/components/dashboard/MembershipPlanManager";

const modules: Record<string, { title: string; description: string; icon: typeof Settings }> = {
  branding: { title: "Branding", description: "No custom branding has been added yet.", icon: Settings },
  team: { title: "Team", description: "No additional team members have been invited yet.", icon: UserPlus },
  billing: { title: "Billing", description: "No billing activity is available.", icon: WalletCards }
};

export default async function DashboardSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "memberships") return <MembershipPlanManager />;
  const selectedModule = modules[section];
  if (!selectedModule) notFound();
  return <div className="space-y-5"><h1 className="font-display text-3xl font-extrabold text-brand-900">{selectedModule.title}</h1><EmptyState title={selectedModule.description} description="This area will display information for the current organization when it is available." icon={selectedModule.icon} /></div>;
}

