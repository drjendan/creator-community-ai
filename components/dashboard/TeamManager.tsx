"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus, Search, ShieldCheck, UserPlus } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { tenantTeamRoleKeys, tenantTeamRoleLabels } from "@/lib/permissions";

type Person = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_sign_in_at?: string;
};

type Invitation = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  expires_at: string;
  delivery_error?: string;
};

type AccessHistoryItem = {
  id: string;
  action: string;
  created_at: string;
};

const roleOptions = tenantTeamRoleKeys.map((role) => [role, tenantTeamRoleLabels[role]] as const);

function roleLabel(role: string) {
  return (
    roleOptions.find(([key]) => key === role)?.[1] ||
    role.replaceAll("_", " ")
  );
}

export function TeamManager() {
  const [people, setPeople] = useState<Person[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [history, setHistory] = useState<AccessHistoryItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    const response = await fetch("/api/team", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      setPeople(result.people ?? []);
      setInvitations(result.invitations ?? []);
      setHistory(result.history ?? []);
      setCurrentUserId(result.currentUserId ?? "");
    } else {
      setMessage(result.error ?? "Unable to load the team.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPeople = useMemo(
    () =>
      people.filter(
        (person) =>
          `${person.name} ${person.email}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (roleFilter === "all" || person.role === roleFilter) &&
          (statusFilter === "all" || person.status === statusFilter)
      ),
    [people, roleFilter, search, statusFilter]
  );

  const activeInvitations = invitations.filter((invitation) =>
    ["pending", "sent", "failed", "expired"].includes(invitation.status)
  );

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: data.get("firstName"),
        lastName: data.get("lastName"),
        email: data.get("email"),
        role: data.get("role"),
        personalMessage: data.get("personalMessage")
      })
    });
    const result = await response.json();
    if (response.ok) {
      setMessage("Invitation email sent.");
      form.reset();
      await load();
    } else {
      setMessage(result.error ?? "Unable to create this invitation.");
      await load();
    }
    setBusy(false);
  }

  async function updateMembership(
    membershipId: string,
    action: string,
    role?: string
  ) {
    if (
      ["remove", "deactivate"].includes(action) &&
      !window.confirm(`Confirm ${action} access for this team member?`)
    ) {
      return;
    }
    setBusy(true);
    const response = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: "membership",
        membershipId,
        action,
        role
      })
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? result.warning || "Team access updated."
        : result.error ?? "Unable to update access."
    );
    if (response.ok) await load();
    setBusy(false);
  }

  async function changeInvitationRole(invitationId: string, role: string) {
    const response = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: "invitation",
        invitationId,
        action: "role",
        role
      })
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? result.warning || "Pending invitation role updated."
        : result.error ?? "Unable to update the invitation."
    );
    if (response.ok) await load();
  }

  async function invitationAction(
    invitationId: string,
    action: "resend"
  ) {
    setBusy(true);
    const response = await fetch("/api/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action })
    });
    const result = await response.json();
    setMessage(response.ok ? "Invitation resent." : result.error ?? "Unable to update the invitation.");
    if (response.ok) await load();
    setBusy(false);
  }

  async function revoke(invitationId: string) {
    if (!window.confirm("Revoke this invitation? Its secure link will stop working.")) {
      return;
    }
    const response = await fetch(
      `/api/team?invitationId=${encodeURIComponent(invitationId)}`,
      { method: "DELETE" }
    );
    const result = await response.json();
    setMessage(
      response.ok
        ? "Invitation revoked."
        : result.error ?? "Unable to revoke invitation."
    );
    if (response.ok) await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">
            Team
          </h1>
          <p className="mt-2 text-sm text-brand-600">
            Invite staff and manage tenant-scoped roles and access.
          </p>
        </div>
        <Button href="#invite-team-member">
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700"
        >
          {message}
        </p>
      )}
      <Card id="invite-team-member">
        <h2 className="font-display text-xl font-bold text-brand-900">
          Invite Team Member
        </h2>
        <form onSubmit={invite} className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="First name" htmlFor="team-first-name" required>
            <Input id="team-first-name" name="firstName" required />
          </Field>
          <Field label="Last name" htmlFor="team-last-name" required>
            <Input id="team-last-name" name="lastName" required />
          </Field>
          <Field label="Email address" htmlFor="team-email" required>
            <Input id="team-email" name="email" type="email" required />
          </Field>
          <Field label="Tenant role" htmlFor="team-role">
            <Select id="team-role" name="role">
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Optional message"
            htmlFor="team-message"
            className="md:col-span-2"
          >
            <Textarea id="team-message" name="personalMessage" maxLength={1000} />
          </Field>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button type="submit" disabled={busy}>
              <MailPlus className="h-4 w-4" />
              {busy ? "Sending…" : "Send Invitation"}
            </Button>
            <Button type="reset" variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">
          Pending Invitations
        </h2>
        {activeInvitations.length ? (
          <div className="mt-4 divide-y divide-brand-100">
            {activeInvitations.map((invitation) => (
              <div key={invitation.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-brand-900">
                      {[invitation.first_name, invitation.last_name]
                        .filter(Boolean)
                        .join(" ") || invitation.email}
                    </p>
                    <p className="text-xs text-brand-500">{invitation.email}</p>
                    <p className="mt-1 text-xs capitalize text-brand-500">
                      {invitation.status} · expires{" "}
                      {new Date(invitation.expires_at).toLocaleString()}
                    </p>
                    {invitation.delivery_error && (
                      <p className="mt-1 text-xs font-semibold text-red-700">
                        {invitation.delivery_error}
                      </p>
                    )}
                  </div>
                  <Select
                    aria-label={`Role for invitation to ${invitation.email}`}
                    value={invitation.role}
                    onChange={(event) =>
                      void changeInvitationRole(invitation.id, event.target.value)
                    }
                  >
                    {roleOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void invitationAction(invitation.id, "resend")}
                  >
                    Resend invitation
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void revoke(invitation.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-600">
            No pending invitations.
          </p>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent-700" /><h2 className="font-display text-xl font-bold text-brand-900">Roles &amp; Permissions</h2></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {roleOptions.map(([role, label]) => (
            <div key={role} className="rounded-xl border border-brand-100 p-4">
              <p className="font-bold text-brand-900">{label}</p>
              <p className="mt-1 text-xs text-brand-500">{role === "tenant_admin" ? "Team, content, communications, support, and analytics administration." : role === "billing_admin" ? "Organization billing administration." : role === "communication_manager" ? "Communication Hub administration." : role === "content_manager" ? "Content administration." : role === "support_manager" ? "Tenant support administration." : role === "analyst" ? "Analytics and reporting access." : role === "contributor" ? "Create and edit assigned content." : "Read-only workspace access."}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">
          Access History
        </h2>
        {history.length ? (
          <div className="mt-4 divide-y divide-brand-100">
            {history.slice(0, 25).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-semibold capitalize text-brand-800">
                  {item.action.replaceAll(".", " ").replaceAll("_", " ")}
                </span>
                <time
                  className="text-xs text-brand-500"
                  dateTime={item.created_at}
                >
                  {new Date(item.created_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-brand-600">
            No team access changes recorded yet.
          </p>
        )}
      </Card>

      <Card padded={false}>
        <div className="border-b border-brand-100 px-5 py-4">
          <h2 className="font-display text-xl font-bold text-brand-900">
            Team Members
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Search" htmlFor="team-search">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-brand-400" />
                <Input
                  id="team-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label="Role filter" htmlFor="team-role-filter">
              <Select
                id="team-role-filter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="all">All roles</option>
                <option value="tenant_owner">Tenant owner</option>
                {roleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status filter" htmlFor="team-status-filter">
              <Select
                id="team-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          </div>
        </div>
        {people.length <= 1 && (
          <div className="border-b border-brand-100 bg-accent-50 px-5 py-4">
            <p className="font-bold text-brand-900">
              You are currently the only administrator for this organization.
            </p>
            <Button href="#invite-team-member" size="sm" className="mt-3">
              Invite Team Member
            </Button>
          </div>
        )}
        {filteredPeople.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700">
                <tr>
                  <th className="px-5 py-3">Person</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last sign-in</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((person) => (
                  <tr key={person.id} className="border-t border-brand-100">
                    <td className="px-5 py-4">
                      <p className="font-bold text-brand-900">{person.name}</p>
                      <p className="text-xs text-brand-500">{person.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      {person.role === "tenant_owner" ? (
                        <span>{roleLabel(person.role)}</span>
                      ) : (
                        <Select
                          aria-label={`Role for ${person.name}`}
                          value={person.role}
                          disabled={busy}
                          onChange={(event) =>
                            void updateMembership(
                              person.id,
                              "role",
                              event.target.value
                            )
                          }
                        >
                          {roleOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </td>
                    <td className="px-5 py-4 capitalize">{person.status}</td>
                    <td className="px-5 py-4">
                      {person.last_sign_in_at
                        ? new Date(person.last_sign_in_at).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      {person.role !== "tenant_owner" && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              void updateMembership(
                                person.id,
                                person.status === "active"
                                  ? "deactivate"
                                  : "reactivate"
                              )
                            }
                          >
                            {person.status === "active"
                              ? "Deactivate"
                              : "Reactivate"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busy || person.user_id === currentUserId}
                            onClick={() =>
                              void updateMembership(person.id, "remove")
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="font-bold text-brand-900">
              {people.length <= 1
                ? "You are currently the only administrator for this organization."
                : "No team members match the selected filters."}
            </p>
            <Button href="#invite-team-member" className="mt-4">
              Invite Team Member
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
