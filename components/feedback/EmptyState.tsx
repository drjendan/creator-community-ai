import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon: Icon = Inbox,
  className
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex h-full flex-col items-start">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-100 text-accent-700">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-5 font-display text-xl font-bold text-brand-900">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-brand-600">{description}</p>
        {actionLabel && actionHref && <Button href={actionHref} className="mt-5">{actionLabel}</Button>}
      </div>
    </Card>
  );
}
