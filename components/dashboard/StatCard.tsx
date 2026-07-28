import { Card } from "@/components/ui";

export function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Card className="h-full border-brand-200 bg-white">
      <p className="text-sm font-medium text-brand-600">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-brand-900">{value}</p>
      {note && <p className="mt-2 text-xs text-brand-500">{note}</p>}
    </Card>
  );
}
