import { LifeBuoy } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PlatformSupportQueue, type PlatformSupportRequest } from "@/components/platform/PlatformSupportQueue";
import { getPlatformAccess } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PlatformSupportPage() {
  const access = await getPlatformAccess();
  if (!access?.permissions.has("platform.support.view")) {
    return <EmptyState title="Platform support access is unavailable." description="Your platform role does not include support visibility." icon={LifeBuoy} />;
  }
  const admin = createAdminClient();
  const [{ data: requests }, { data: tenants }, authResult] = await Promise.all([
    admin.from("support_requests").select("id,tenant_id,user_id,subject,body,status,metadata,created_at,updated_at").order("created_at", { ascending: false }),
    admin.from("tenants").select("id,name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);
  const tenantNames = new Map((tenants ?? []).map((tenant) => [tenant.id, tenant.name]));
  const userEmails = new Map(authResult.data.users.map((user) => [user.id, user.email ?? "Unknown account"]));
  const items: PlatformSupportRequest[] = (requests ?? []).map((request) => ({
    id: request.id,
    tenantName: tenantNames.get(request.tenant_id) ?? "Unknown tenant",
    requesterEmail: request.user_id ? userEmails.get(request.user_id) ?? "Unknown account" : "System request",
    subject: request.subject,
    body: request.body,
    status: request.status,
    category: String((request.metadata as Record<string, unknown> | null)?.category ?? "General"),
    createdAt: request.created_at,
    updatedAt: request.updated_at
  }));
  const open = items.filter((item) => item.status === "open").length;
  const inProgress = items.filter((item) => item.status === "in_progress").length;
  const resolved = items.filter((item) => ["resolved", "closed"].includes(item.status)).length;

  return (
    <div className="space-y-7">
      <div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Platform operations</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Platform Support</h1><p className="mt-2 text-sm text-brand-600">Review tenant requests and maintain an audited resolution status.</p></div>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Platform support summary"><StatCard label="Open" value={open} /><StatCard label="In progress" value={inProgress} /><StatCard label="Resolved or closed" value={resolved} /></section>
      <PlatformSupportQueue initialRequests={items} canManage={access.permissions.has("platform.support.manage")} />
    </div>
  );
}
