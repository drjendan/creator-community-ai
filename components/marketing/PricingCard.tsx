import { Check } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { plans } from "@/lib/mock/podcastos";
import { cn } from "@/lib/cn";

type Plan = (typeof plans)[number] & { popular?: boolean };
export function PricingCard({ plan }: { plan: Plan }) {
  return (
    <Card className={cn("relative flex h-full flex-col p-7", plan.popular && "border-2 border-accent-500 shadow-lift")}>
      {plan.popular && <span className="absolute right-5 top-0 -translate-y-1/2 rounded-full bg-success px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-900">Most Popular</span>}
      <p className="text-xs font-bold uppercase tracking-[.15em] text-accent-700">{plan.name}</p>
      <div className="mt-4 flex items-end gap-2"><span className="font-display text-4xl font-extrabold text-brand-900">{plan.priceLabel}</span><span className="pb-1 text-sm text-brand-500">{plan.cadence}</span></div>
      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm leading-5 text-brand-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{feature}</li>)}
      </ul>
      <Button href="/request-demo" className="mt-7 w-full" variant={plan.popular ? "primary" : "secondary"}>{plan.button}</Button>
    </Card>
  );
}

