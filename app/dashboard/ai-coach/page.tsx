import { Bot } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function AICoachPage() {
  return <div className="space-y-5"><h1 className="font-display text-3xl font-extrabold text-brand-900">AI Coach</h1><EmptyState title="No AI Coach activity yet." description="AI Coach activity will appear after it is configured and members begin using it." icon={Bot} /></div>;
}
