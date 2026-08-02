import { SupportCenter } from "@/components/dashboard/SupportCenter";
import { getActiveTenantManager } from "@/lib/tenant-context";

export default async function SupportPage() {
  const context = await getActiveTenantManager();
  const { data } = context
    ? await context.supabase.from("support_requests").select("id,subject,body,status,created_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id).order("created_at", { ascending: false })
    : { data: [] };
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Support</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">UpNexx Support</h1>
        <p className="mt-2 text-sm text-brand-600">Submit a request and track its current status.</p>
      </div>
      <SupportCenter initialRequests={data ?? []} />
    </div>
  );
}
