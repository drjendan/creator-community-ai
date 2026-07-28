import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui";

export function CapabilityCard({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <Card className="group h-full border-brand-200/80 transition hover:-translate-y-1 hover:border-accent-300 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-50 text-accent-700"><Icon className="h-5 w-5" /></span>
        <ArrowUpRight className="h-5 w-5 text-brand-300 transition group-hover:text-accent-600" />
      </div>
      <h3 className="mt-5 font-display text-lg font-bold text-brand-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-brand-600">{description}</p>
    </Card>
  );
}
