import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdministrator } from "@/lib/platform-context";

export default async function DeletedTenantsPage() {
  const access = await getPlatformAdministrator("platform.team.grant_owner");
  if (!access || access.role !== "platform_owner") notFound();
  const admin = createAdminClient();
  const { data: records } = await admin
    .from("platform_tenant_deletion_records")
    .select("id,tenant_id,tenant_name,tenant_slug,deleted_at,deletion_reason,retention_mode")
    .order("deleted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Button href="/platform-admin/tenants" variant="secondary"><ArrowLeft className="h-4 w-4" />Active tenant management</Button>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Restricted</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Deleted tenant records</h1>
        <p className="mt-2 text-sm text-brand-600">Retention-safe tombstones preserve legally required billing and audit history.</p>
      </div>
      <Card padded={false} className="overflow-hidden">
        {records?.length ? <div className="divide-y divide-brand-200">{records.map((record) => <div key={record.id} className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="flex gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-700"><Trash2 className="h-4 w-4" /></span><div><p className="font-bold text-brand-900">{record.tenant_name}</p><p className="text-xs text-brand-500">{record.tenant_slug} · {record.tenant_id}</p><p className="mt-2 text-sm text-brand-700">{record.deletion_reason}</p></div></div><div className="text-right text-xs text-brand-500"><p>{new Date(record.deleted_at).toLocaleString()}</p><p className="mt-1 capitalize">{record.retention_mode}</p></div></div>)}</div> : <p className="p-8 text-center text-sm text-brand-500">No deleted tenant records.</p>}
      </Card>
    </div>
  );
}
