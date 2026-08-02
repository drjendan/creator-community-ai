import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { EventExperienceManager } from "@/components/dashboard/EventExperienceManager";
import { Button } from "@/components/ui";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const context = await getActiveTenantWithPermission("tenant.events.manage"); if (!context) notFound();
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase); if (entitlements.get("events") !== true) notFound();
  const { data: event } = await context.supabase.from("events").select("id,title,description,status,starts_at").eq("tenant_id", context.tenant.id).eq("id", id).maybeSingle(); if (!event) notFound();
  return <div className="space-y-6"><Button href="/dashboard/events" variant="ghost"><ArrowLeft className="h-4 w-4" /> Back to Events</Button><div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">{event.status}</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">{event.title}</h1><p className="mt-2 text-sm font-semibold text-brand-500">Starts {new Date(event.starts_at).toLocaleString()}</p><p className="mt-3 max-w-3xl text-brand-600">{event.description || "No description has been added."}</p></div><EventExperienceManager eventId={id} /></div>;
}
