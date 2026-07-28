import { ShieldCheck, UserRound, Users } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Card } from "@/components/ui";
import { getCurrentTenantPeople } from "@/lib/tenant-people";

const roleLabels: Record<string, string> = {
  platform_owner: "Platform owner",
  platform_admin: "Platform administrator",
  tenant_owner: "Organization owner",
  tenant_admin: "Organization administrator",
  content_manager: "Content manager",
  community_moderator: "Community moderator",
  member: "Member",
  guest: "Guest"
};

export default async function MembersPage() {
  const data = await getCurrentTenantPeople();
  if (!data) {
    return <EmptyState title="Administrator access is required" description="Only an organization owner or administrator can view its users." icon={ShieldCheck} />;
  }
  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-extrabold text-brand-900">Organization Users</h1><p className="mt-2 text-sm text-brand-600">View the administrators, team members, and audience members assigned to {data.tenant.name}.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><Users className="h-5 w-5 text-accent-700" /><p className="mt-3 text-2xl font-extrabold text-brand-900">{data.activeCount}</p><p className="text-sm text-brand-600">Active users</p></Card>
        <Card><ShieldCheck className="h-5 w-5 text-accent-700" /><p className="mt-3 text-2xl font-extrabold text-brand-900">{data.teamCount}</p><p className="text-sm text-brand-600">Owners and team</p></Card>
        <Card><UserRound className="h-5 w-5 text-accent-700" /><p className="mt-3 text-2xl font-extrabold text-brand-900">{data.audienceCount}</p><p className="text-sm text-brand-600">Audience members</p></Card>
      </div>
      {data.people.length ? (
        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-brand-200 px-5 py-4">
            <h2 className="font-display text-xl font-bold text-brand-900">All users</h2>
            <p className="mt-1 text-sm text-brand-500">This is the same tenant-membership data used by the platform Users total.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Joined</th></tr></thead>
              <tbody>{data.people.map((person) => <tr key={person.id} className="border-t border-brand-200"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-100 font-bold text-accent-800">{person.name.slice(0, 1).toUpperCase()}</span><div><p className="font-bold text-brand-900">{person.name}</p><p className="text-xs text-brand-500">{person.email ?? "Email unavailable"}</p></div></div></td><td className="px-5 py-4 text-brand-600">{person.category}</td><td className="px-5 py-4 text-brand-600">{roleLabels[person.role] ?? person.role.replaceAll("_", " ")}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${person.status === "active" ? "bg-success-soft text-success-strong" : "bg-brand-100 text-brand-600"}`}>{person.status}</span></td><td className="px-5 py-4 text-brand-600">{new Date(person.joinedAt).toLocaleDateString()}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState title="No users are assigned yet." description="Invite an owner, team member, or audience member to begin." icon={Users} />
      )}
    </div>
  );
}
