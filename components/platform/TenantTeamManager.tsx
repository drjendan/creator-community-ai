"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { History, MailPlus, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type RoleOption = { role: string; label: string };
type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined_at?: string | null;
  created_at: string;
  last_login?: string | null;
};
type Invitation = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
  delivery_error?: string | null;
};
type AccessEvent = {
  id: string;
  action: string;
  created_at: string;
};
type TeamData = {
  people?: Person[];
  invitations?: Invitation[];
  roles?: RoleOption[];
  history?: AccessEvent[];
  error?: string;
};

export function TenantTeamManager({
  tenantId,
  tenantName
}: {
  tenantId: string;
  tenantName: string;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [history, setHistory] = useState<AccessEvent[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const endpoint = `/api/platform/tenants/${tenantId}/team`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as TeamData;
    if (response.ok) {
      setPeople(result.people ?? []);
      setInvitations(result.invitations ?? []);
      setRoles(result.roles ?? []);
      setHistory(result.history ?? []);
      setError("");
    } else {
      setError(result.error || "Unable to load the tenant team.");
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  async function request(
    method: string,
    body?: Record<string, unknown>,
    query = ""
  ) {
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch(`${endpoint}${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json().catch(() => ({})) as { error?: string; warning?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error || "Unable to update the tenant team.");
      return false;
    }
    setMessage(result.warning || "Tenant team access updated.");
    await load();
    return true;
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const success = await request("POST", {
      firstName: values.get("firstName"),
      lastName: values.get("lastName"),
      email: values.get("email"),
      role: values.get("role"),
      personalMessage: values.get("personalMessage")
    });
    if (success) form.reset();
  }

  async function updateMembership(
    membershipId: string,
    action: "role" | "deactivate" | "reactivate" | "remove",
    role?: string
  ) {
    if (
      ["deactivate", "remove"].includes(action) &&
      !window.confirm(`Confirm ${action} for this tenant team member?`)
    ) return;
    await request("PATCH", {
      target: "membership",
      membershipId,
      action,
      role
    });
  }

  const activeInvitations = invitations.filter((invitation) =>
    ["pending", "sent", "failed", "expired"].includes(invitation.status)
  );

  return (
    <Card id="tenant-team-access">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent-700" />
            <h2 className="font-display text-xl font-bold text-brand-900">
              Tenant Team &amp; Owners
            </h2>
          </div>
          <p className="mt-2 text-sm text-brand-600">
            Invite Tenant Owners and staff roles directly to {tenantName}.
          </p>
        </div>
        <Button href="#invite-tenant-team-member">
          <UserPlus className="h-4 w-4" />
          Add Tenant Team Member
        </Button>
      </div>

      {message && (
        <p role="status" className="mt-5 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}

      <form
        id="invite-tenant-team-member"
        onSubmit={invite}
        className="mt-6 grid gap-4 rounded-xl border border-brand-100 bg-brand-50 p-5 md:grid-cols-2"
      >
        <Field label="First name" htmlFor="platform-tenant-team-first">
          <Input id="platform-tenant-team-first" name="firstName" required />
        </Field>
        <Field label="Last name" htmlFor="platform-tenant-team-last">
          <Input id="platform-tenant-team-last" name="lastName" required />
        </Field>
        <Field label="Email address" htmlFor="platform-tenant-team-email">
          <Input id="platform-tenant-team-email" name="email" type="email" required />
        </Field>
        <Field label="Tenant role" htmlFor="platform-tenant-team-role">
          <Select id="platform-tenant-team-role" name="role" required>
            {roles.map((role) => (
              <option key={role.role} value={role.role}>{role.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Optional message" htmlFor="platform-tenant-team-message" className="md:col-span-2">
          <Textarea id="platform-tenant-team-message" name="personalMessage" maxLength={1000} />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy || !roles.length}>
            <MailPlus className="h-4 w-4" />
            {busy ? "Sending…" : "Send Secure Invitation"}
          </Button>
        </div>
      </form>

      <div className="mt-7">
        <h3 className="font-display text-lg font-bold text-brand-900">Current Tenant Team</h3>
        {people.length ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-brand-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id} className="border-t border-brand-100 align-top">
                    <td className="px-4 py-4">
                      <p className="font-bold text-brand-900">{person.name}</p>
                      <p className="text-xs text-brand-500">{person.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Select
                        aria-label={`Role for ${person.name}`}
                        value={person.role}
                        disabled={busy}
                        onChange={(event) => void updateMembership(person.id, "role", event.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role.role} value={role.role}>{role.label}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-4 capitalize">{person.status}</td>
                    <td className="px-4 py-4 text-brand-600">{formatDate(person.last_login)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void updateMembership(
                            person.id,
                            person.status === "active" ? "deactivate" : "reactivate"
                          )}
                        >
                          {person.status === "active" ? "Deactivate" : "Reactivate"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void updateMembership(person.id, "remove")}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800">
            No tenant team members are assigned. Invite a Tenant Owner to restore workspace ownership.
          </p>
        )}
      </div>

      <div className="mt-7">
        <h3 className="font-display text-lg font-bold text-brand-900">Pending Invitations</h3>
        {activeInvitations.length ? (
          <div className="mt-3 space-y-3">
            {activeInvitations.map((invitation) => (
              <div key={invitation.id} className="rounded-xl border border-brand-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-brand-900">
                      {[invitation.first_name, invitation.last_name].filter(Boolean).join(" ") || invitation.email}
                    </p>
                    <p className="text-xs text-brand-500">{invitation.email}</p>
                    <p className="mt-1 text-xs capitalize text-brand-500">
                      {invitation.status} · expires {formatDate(invitation.expires_at)}
                    </p>
                    {invitation.delivery_error && (
                      <p className="mt-1 text-xs font-semibold text-red-700">{invitation.delivery_error}</p>
                    )}
                  </div>
                  <Select
                    aria-label={`Invitation role for ${invitation.email}`}
                    value={invitation.role}
                    disabled={busy}
                    onChange={(event) => void request("PATCH", {
                      target: "invitation",
                      invitationId: invitation.id,
                      action: "role",
                      role: event.target.value
                    })}
                  >
                    {roles.map((role) => (
                      <option key={role.role} value={role.role}>{role.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void request("PUT", { invitationId: invitation.id })}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Resend
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() =>
                      window.confirm("Revoke this tenant invitation?") &&
                      void request("DELETE", undefined, `?invitationId=${encodeURIComponent(invitation.id)}`)
                    }
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-brand-500">No pending tenant invitations.</p>
        )}
      </div>

      <div className="mt-7 border-t border-brand-100 pt-6">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-accent-700" />
          <h3 className="font-display text-lg font-bold text-brand-900">Tenant Access History</h3>
        </div>
        {history.length ? (
          <ol className="mt-3 divide-y divide-brand-100">
            {history.slice(0, 25).map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold capitalize text-brand-800">{event.action.replaceAll(".", " ").replaceAll("_", " ")}</span>
                <time className="text-xs text-brand-500" dateTime={event.created_at}>{formatDate(event.created_at)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-brand-500">No tenant access changes recorded yet.</p>
        )}
      </div>
    </Card>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}
