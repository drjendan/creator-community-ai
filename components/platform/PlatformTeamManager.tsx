"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { History, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { platformRoleLabels, type PlatformPermission, type PlatformRole } from "@/lib/permissions";

type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role_key: PlatformRole;
  status: string;
  invited_by?: string | null;
  invited_by_label?: string;
  accepted_at?: string | null;
  created_at: string;
  last_login?: string | null;
};

type Invitation = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_key: PlatformRole;
  status: string;
  invited_by_label: string;
  expires_at: string;
  sent_at?: string | null;
  accepted_at?: string | null;
  created_at: string;
  delivery_error?: string | null;
};

type AccessEvent = {
  id: string;
  action: string;
  actor_role?: string | null;
  target_user_id?: string | null;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  created_at: string;
};

type TeamData = {
  people: Person[];
  invitations: Invitation[];
  roles: { role_key: PlatformRole; label: string; description?: string }[];
  rolePermissions: { role_key: PlatformRole; permission_key: PlatformPermission }[];
  permissions: PlatformPermission[];
  history: AccessEvent[];
  currentUserId: string;
  actorPermissions: PlatformPermission[];
};

export function PlatformTeamManager() {
  const [data, setData] = useState<TeamData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/platform/team", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setData(result as TeamData);
    else setError(result.error || "Unable to load the platform team.");
  }, []);

  useEffect(() => { void load(); }, [load]);

  const permissions = new Set(data?.actorPermissions ?? []);
  const people = useMemo(() => (data?.people ?? []).filter((person) =>
    `${person.name} ${person.email} ${person.role_key}`.toLowerCase().includes(search.toLowerCase())
  ), [data?.people, search]);

  async function request(method: string, body?: Record<string, unknown>, query = "") {
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`/api/platform/team${query}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json().catch(() => ({})) as { error?: string; warning?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error || "Unable to update platform access.");
      return false;
    }
    setMessage(result.warning || "Platform access updated.");
    await load();
    return true;
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (await request("POST", {
      firstName: values.get("firstName"),
      lastName: values.get("lastName"),
      email: values.get("email"),
      role: values.get("role")
    })) form.reset();
  }

  if (!data && !error) return <p role="status" className="text-sm font-semibold text-brand-600">Loading platform team…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Team &amp; Access</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Platform Team</h1>
          <p className="mt-2 text-sm text-brand-600">Manage internal UpNexx access separately from tenant workspace memberships.</p>
        </div>
        {permissions.has("platform.team.invite") && <Button href="#platform-invite"><UserPlus className="h-4 w-4" />Invite Platform Member</Button>}
      </div>
      {message && <p role="status" className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {permissions.has("platform.team.invite") && (
        <Card id="platform-invite">
          <h2 className="font-display text-xl font-bold text-brand-900">Invite a Platform Team Member</h2>
          <p className="mt-2 text-sm text-brand-600">The recipient receives a hashed, single-use invitation that expires after seven days.</p>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={invite}>
            <Field label="First name" htmlFor="platform-first-name"><Input id="platform-first-name" name="firstName" required /></Field>
            <Field label="Last name" htmlFor="platform-last-name"><Input id="platform-last-name" name="lastName" required /></Field>
            <Field label="Email address" htmlFor="platform-email"><Input id="platform-email" name="email" type="email" required /></Field>
            <Field label="Platform role" htmlFor="platform-role">
              <Select id="platform-role" name="role">
                {(data?.roles ?? []).filter((role) => role.role_key !== "platform_owner" || permissions.has("platform.team.grant_owner")).map((role) => <option key={role.role_key} value={role.role_key}>{role.label}</option>)}
              </Select>
            </Field>
            <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send Secure Invitation"}</Button></div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-100 px-5 py-4">
          <div><h2 className="font-display text-xl font-bold text-brand-900">Platform Team</h2><p className="mt-1 text-sm text-brand-500">{data?.people.length ?? 0} current records</p></div>
          <Field label="Search" htmlFor="platform-team-search">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-brand-400" /><Input id="platform-team-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </Field>
        </div>
        {people.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700"><tr><th className="px-5 py-3">Person</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Accepted</th><th className="px-5 py-3">Last login</th><th className="px-5 py-3">Actions</th></tr></thead>
              <tbody>{people.map((person) => (
                <tr key={person.id} className="border-t border-brand-100 align-top">
                  <td className="px-5 py-4"><p className="font-bold text-brand-900">{person.name}</p><p className="text-xs text-brand-500">{person.email}</p></td>
                  <td className="px-5 py-4">
                    {permissions.has("platform.team.manage_roles") && person.user_id !== data?.currentUserId ? (
                      <Select aria-label={`Role for ${person.name}`} value={person.role_key} disabled={busy} onChange={(event) => void request("PATCH", { target: "membership", membershipId: person.id, action: "role", role: event.target.value })}>
                        {(data?.roles ?? []).filter((role) => role.role_key !== "platform_owner" || permissions.has("platform.team.grant_owner")).map((role) => <option key={role.role_key} value={role.role_key}>{role.label}</option>)}
                      </Select>
                    ) : platformRoleLabels[person.role_key]}
                  </td>
                  <td className="px-5 py-4 capitalize">{person.status}</td>
                  <td className="px-5 py-4 text-brand-600">
                    <p>{person.accepted_at ? "Accepted" : "Provisioned"} · {formatDate(person.accepted_at || person.created_at)}</p>
                    <p className="mt-1 text-xs text-brand-500">Invited by {person.invited_by_label || "Bootstrap"}</p>
                  </td>
                  <td className="px-5 py-4 text-brand-600">{formatDate(person.last_login)}</td>
                  <td className="px-5 py-4">
                    {person.user_id !== data?.currentUserId && <div className="flex flex-wrap gap-2">
                      {permissions.has("platform.team.suspend") && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void request("PATCH", { target: "membership", membershipId: person.id, action: person.status === "active" ? "suspend" : "reactivate" })}>{person.status === "active" ? "Suspend" : "Reactivate"}</Button>}
                      {permissions.has("platform.team.remove") && <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => window.confirm(`Remove ${person.name} from the platform team?`) && void request("PATCH", { target: "membership", membershipId: person.id, action: "remove" })}>Remove</Button>}
                    </div>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="p-8 text-center text-sm text-brand-500"><Users className="mx-auto h-7 w-7" /><p className="mt-3">No platform members match this search.</p></div>}
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">Pending Invitations</h2>
        <div className="mt-4 space-y-3">
          {(data?.invitations ?? []).filter((invitation) => ["pending", "failed", "expired"].includes(invitation.status)).map((invitation) => (
            <div key={invitation.id} className="rounded-xl border border-brand-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-bold text-brand-900">{invitation.first_name} {invitation.last_name}</p><p className="text-xs text-brand-500">{invitation.email}</p><p className="mt-1 text-xs text-brand-500">Invited by {invitation.invited_by_label} · {formatDate(invitation.created_at)} · expires {formatDate(invitation.expires_at)}</p></div>
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold capitalize text-brand-700">{invitation.status}</span>
              </div>
              {invitation.delivery_error && <p className="mt-2 text-xs font-semibold text-red-700">{invitation.delivery_error}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {permissions.has("platform.team.invite") && <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void request("PUT", { invitationId: invitation.id })}>Resend</Button>}
                {permissions.has("platform.team.invite") && <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void request("DELETE", undefined, `?invitationId=${encodeURIComponent(invitation.id)}`)}>Revoke</Button>}
              </div>
            </div>
          ))}
          {!data?.invitations.some((invitation) => ["pending", "failed", "expired"].includes(invitation.status)) && <p className="text-sm text-brand-500">No pending invitations.</p>}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent-700" /><h2 className="font-display text-xl font-bold text-brand-900">Roles &amp; Permissions</h2></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(data?.roles ?? []).map((role) => (
            <div key={role.role_key} className="rounded-xl border border-brand-100 p-4">
              <h3 className="font-bold text-brand-900">{role.label}</h3>
              <p className="mt-1 text-xs text-brand-500">{role.description}</p>
              <ul className="mt-3 space-y-1 text-xs text-brand-600">{data?.rolePermissions.filter((item) => item.role_key === role.role_key).map((item) => <li key={item.permission_key}>• {item.permission_key}</li>)}</ul>
            </div>
          ))}
        </div>
      </Card>

      {permissions.has("platform.audit.view") && (
        <Card>
          <div className="flex items-center gap-2"><History className="h-5 w-5 text-accent-700" /><h2 className="font-display text-xl font-bold text-brand-900">Access History</h2></div>
          <ol className="mt-4 space-y-3">{(data?.history ?? []).map((event) => <li key={event.id} className="rounded-xl border border-brand-100 px-4 py-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-brand-900">{event.action.replaceAll(".", " · ").replaceAll("_", " ")}</p><time className="text-xs text-brand-500">{formatDate(event.created_at)}</time></div><p className="mt-1 text-xs capitalize text-brand-500">Actor role: {event.actor_role?.replaceAll("_", " ") || "System"}</p></li>)}</ol>
          {!data?.history.length && <p className="mt-4 text-sm text-brand-500">No access events recorded.</p>}
        </Card>
      )}
    </div>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}
