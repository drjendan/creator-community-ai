import { Card } from "@/components/ui";

export function ModulePlaceholder({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold text-brand-900">{title}</h1>
      <Card>
        <p className="text-sm text-brand-700">{description}</p>
        <p className="mt-3 text-xs text-brand-500">This module is part of the MVP shell and will be connected to Supabase in a future phase.</p>
      </Card>
    </div>
  );
}
