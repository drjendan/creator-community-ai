import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ResourceExperienceManager } from "@/components/dashboard/ResourceExperienceManager";
import { Button } from "@/components/ui";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const context = await getActiveTenantWithPermission("tenant.resources.manage"); if (!context) notFound(); const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase); if (entitlements.get("resources") !== true) notFound();
  const { data: resource } = await context.supabase.from("resources").select("id,title,description,status,resource_type,url").eq("tenant_id", context.tenant.id).eq("id", id).maybeSingle(); if (!resource) notFound();
  return <div className="space-y-6"><Button href="/dashboard/resources" variant="ghost"><ArrowLeft className="h-4 w-4" /> Back to Resources</Button><div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">{resource.status} · {resource.resource_type}</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">{resource.title}</h1><p className="mt-3 max-w-3xl text-brand-600">{resource.description || "No description has been added."}</p><a href={resource.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-accent-700">Open current resource</a></div><ResourceExperienceManager resourceId={id} /></div>;
}
