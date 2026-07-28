import { Layers3 } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";

export default async function PlatformSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const title = section.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
  return <div className="space-y-5"><h1 className="font-display text-3xl font-extrabold text-brand-900">{title}</h1><EmptyState title={`No ${title.toLowerCase()} data available.`} description="Production records will appear here when they are available." icon={Layers3} /></div>;
}
