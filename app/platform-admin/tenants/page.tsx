import Link from "next/link";
import { Building2, Palette, Settings2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { TenantCreationWizard } from "@/components/platform/TenantCreationWizard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  tenantTypeLabels,
  type TenantType
} from "@/lib/subscriptions";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tenant_type?: TenantType;
  created_at: string;
  owner_invitation_last_sent_at?: string | null;
  owner_activated_at?: string | null;
};

export default async function TenantsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; error?: string; status?: string }>;
}) {
  const { success, error, status = "active" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const platformRole = user?.app_metadata?.platform_role;
  const authorized =
    platformRole === "platform_owner" || platformRole === "platform_admin";
  let tenants: TenantRow[] = [];
  const memberCounts = new Map<string, number>();
  const ownerEmails = new Map<string, string>();

  if (authorized) {
    const admin = createAdminClient();
    const [{ data: tenantRows, error: tenantError }, { data: memberships }, { data: authUsers }] =
      await Promise.all([
        admin
          .from("tenants")
          .select("id,name,slug,status,tenant_type,created_at,owner_invitation_last_sent_at,owner_activated_at")
          .neq("status", "deleted")
          .order("created_at", { ascending: true }),
        admin.from("tenant_memberships").select("tenant_id,user_id,role"),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      ]);
    if (tenantError && /tenant_type/i.test(tenantError.message)) {
      const { data: legacyRows } = await admin
        .from("tenants")
        .select("id,name,slug,status,created_at")
        .neq("status", "deleted")
        .order("created_at", { ascending: true });
      tenants = (legacyRows ?? []) as TenantRow[];
    } else {
      tenants = (tenantRows ?? []) as TenantRow[];
    }
    for (const membership of memberships ?? []) {
      memberCounts.set(
        membership.tenant_id,
        (memberCounts.get(membership.tenant_id) ?? 0) + 1
      );
      if (membership.role === "tenant_owner") {
        const owner = authUsers.users.find((candidate) => candidate.id === membership.user_id);
        if (owner?.email) ownerEmails.set(membership.tenant_id, owner.email);
      }
    }
    if (["pending", "active", "suspended", "archived"].includes(status)) {
      tenants = tenants.filter((tenant) => tenant.status === status);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-accent-700">
            Tenant management
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">
            UpNexx tenants
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-600">
            Provision organizations, platform subscriptions, feature overrides,
            membership templates, branding, and tenant administrators.
          </p>
        </div>
        <div className="flex gap-2">
          {platformRole === "platform_owner" && <Button href="/platform-admin/tenants/deleted" variant="secondary">Deleted records</Button>}
          <Button href="#new-tenant">Create tenant</Button>
        </div>
      </div>

      {(success || error) && (
        <div
          role={error ? "alert" : "status"}
          className={
            error
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              : "rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong"
          }
        >
          {error ?? success}
        </div>
      )}
      {!authorized && (
        <div
          role="alert"
          className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800"
        >
          Your account needs the <strong>platform_owner</strong> or{" "}
          <strong>platform_admin</strong> app-metadata role.
        </div>
      )}

      {authorized && (
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-brand-200 px-5 py-4">
            <h2 className="font-display text-xl font-bold text-brand-900">
              All tenants
            </h2>
            <p className="text-sm text-brand-500">
              {tenants.length} workspace{tenants.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["pending", "active", "suspended", "archived"].map((filter) => (
                <Link key={filter} href={`/platform-admin/tenants?status=${filter}`} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === filter ? "bg-accent-600 text-white" : "bg-brand-100 text-brand-700"}`}>
                  {filter}
                </Link>
              ))}
            </div>
          </div>
          {tenants.length === 0 ? (
            <p className="p-8 text-center text-sm text-brand-500">
              No tenants have been created yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand-100 text-brand-700">
                  <tr>
                    <th className="px-5 py-3">Tenant</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Users</th>
                    <th className="px-5 py-3">Owner invitation</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-t border-brand-200">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-100 text-accent-700">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-bold text-brand-900">
                              {tenant.name}
                            </p>
                            <p className="text-xs text-brand-500">
                              {tenant.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-brand-600">
                        {tenantTypeLabels[tenant.tenant_type ?? "podcaster"]}
                      </td>
                      <td className="px-5 py-4 text-brand-600">
                        {memberCounts.get(tenant.id) ?? 0}
                      </td>
                      <td className="px-5 py-4 text-brand-600">
                        <p className="font-semibold">{ownerEmails.get(tenant.id) ?? "No owner"}</p>
                        <p className="mt-1 text-xs">{tenant.owner_activated_at ? "Activated" : tenant.owner_invitation_last_sent_at ? `Last sent ${new Date(tenant.owner_invitation_last_sent_at).toLocaleDateString()}` : "Pending"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tenant.status === "active" ? "bg-success-soft text-success-strong" : tenant.status === "suspended" ? "bg-warning-soft text-brand-800" : tenant.status === "archived" ? "bg-brand-200 text-brand-700" : "bg-accent-100 text-accent-800"}`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/platform-admin/tenants/${tenant.id}/branding`}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-accent-700 hover:bg-accent-50"
                          >
                            <Palette className="h-4 w-4" />
                            Branding
                          </Link>
                          <Link
                            href={`/platform-admin/tenants/${tenant.id}`}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-accent-700 hover:bg-accent-50"
                          >
                            <Settings2 className="h-4 w-4" />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <TenantCreationWizard authorized={authorized} />
    </div>
  );
}
