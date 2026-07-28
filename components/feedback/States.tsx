import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function EmptyState({ title, description, actionLabel, actionHref }: { title: string; description: string; actionLabel?: string; actionHref?: string }) {
  return <Card className="py-12 text-center"><Inbox className="mx-auto h-8 w-8 text-brand-400" /><h2 className="mt-4 font-display text-xl font-bold text-brand-900">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-brand-600">{description}</p>{actionLabel && actionHref && <Button href={actionHref} className="mt-6">{actionLabel}</Button>}</Card>;
}
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white p-8 text-sm font-semibold text-brand-600" role="status"><LoaderCircle className="h-5 w-5 animate-spin text-accent-600" />{label}</div>;
}
export function ErrorState({ title = "Something went wrong", description }: { title?: string; description: string }) {
  return <Card className="border-danger/30 bg-danger-soft"><AlertTriangle className="h-6 w-6 text-danger" /><h2 className="mt-3 font-display text-xl font-bold text-brand-900">{title}</h2><p className="mt-2 text-sm text-brand-700">{description}</p></Card>;
}
