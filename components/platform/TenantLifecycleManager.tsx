"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Mail, Play, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";

type Owner = {
  name: string;
  email: string;
  invitationStatus: string;
  originallyInvitedAt?: string | null;
  lastSentAt?: string | null;
  sendCount: number;
  activated: boolean;
  activatedAt?: string | null;
};

type LifecycleAction = "suspend" | "archive" | "delete" | null;

export function TenantLifecycleManager({
  tenant,
  owner,
  canDelete
}: {
  tenant: { id: string; name: string; status: string };
  owner: Owner | null;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [action, setAction] = useState<LifecycleAction>(null);
  const [reason, setReason] = useState("");
  const [confirmationName, setConfirmationName] = useState("");
  const [preflight, setPreflight] = useState<Record<string, number | string[]> | null>(null);

  async function request(body: Record<string, string>) {
    setWorking(body.action);
    setMessage(null);
    const response = await fetch(`/api/platform/tenants/${tenant.id}/lifecycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    setWorking("");
    if (!response.ok) {
      setPreflight(result.preflight ?? null);
      setMessage({ type: "error", text: result.error ?? "The tenant action failed." });
      return false;
    }
    setMessage({ type: "success", text: result.message });
    setAction(null);
    setReason("");
    setConfirmationName("");
    router.refresh();
    return true;
  }

  async function ownerAction(kind: "resend_owner_invitation" | "send_owner_password_reset") {
    const prompt = kind === "resend_owner_invitation"
      ? `Resend the Tenant Owner invitation to ${owner?.email}? The previous invitation link will no longer be used.`
      : `Send a password reset email to ${owner?.email}?`;
    if (!window.confirm(prompt)) return;
    await request({ action: kind });
  }

  async function immediateAction(kind: "reactivate" | "restore") {
    if (!window.confirm(`${kind === "restore" ? "Restore" : "Reactivate"} ${tenant.name}?`)) return;
    await request({ action: kind });
  }

  async function openDelete() {
    setAction("delete");
    setMessage(null);
    const response = await fetch(`/api/platform/tenants/${tenant.id}/lifecycle`, { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setPreflight(result.preflight);
    else setMessage({ type: "error", text: result.error ?? "Unable to run deletion checks." });
  }

  const busy = Boolean(working);
  return (
    <div className="space-y-6">
      {message && (
        <div role={message.type === "error" ? "alert" : "status"} className={message.type === "error" ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" : "rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success-strong"}>
          {message.text}
        </div>
      )}

      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">Tenant Owner</h2>
        {owner ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Name" value={owner.name} />
              <Fact label="Email" value={owner.email} />
              <Fact label="Invitation status" value={owner.invitationStatus} />
              <Fact label="Originally invited" value={date(owner.originallyInvitedAt)} />
              <Fact label="Last invitation sent" value={date(owner.lastSentAt)} />
              <Fact label="Account activation" value={owner.activated ? `Active${owner.activatedAt ? ` · ${date(owner.activatedAt)}` : ""}` : "Not activated"} />
              <Fact label="Invitation send count" value={String(owner.sendCount)} />
            </div>
            {!owner.activated ? (
              <Button type="button" disabled={busy} onClick={() => void ownerAction("resend_owner_invitation")}>
                <Mail className="h-4 w-4" />{working === "resend_owner_invitation" ? "Resending invitation..." : "Resend Owner Invitation"}
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void ownerAction("send_owner_password_reset")}>
                <Mail className="h-4 w-4" />{working === "send_owner_password_reset" ? "Sending password reset..." : "Send Password Reset"}
              </Button>
            )}
          </div>
        ) : <p className="mt-4 text-sm text-brand-600">No Tenant Owner account is assigned.</p>}
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-brand-900">Tenant lifecycle</h2>
            <p className="mt-2 text-sm text-brand-600">Current status: <strong className="capitalize">{tenant.status}</strong></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["active", "pending"].includes(tenant.status) && <Button type="button" variant="secondary" disabled={busy} onClick={() => setAction("suspend")}><ShieldAlert className="h-4 w-4" />Suspend</Button>}
            {tenant.status === "suspended" && <Button type="button" disabled={busy} onClick={() => void immediateAction("reactivate")}><Play className="h-4 w-4" />Reactivate</Button>}
            {["active", "pending", "suspended"].includes(tenant.status) && <Button type="button" variant="secondary" disabled={busy} onClick={() => setAction("archive")}><Archive className="h-4 w-4" />Archive</Button>}
            {tenant.status === "archived" && <Button type="button" disabled={busy} onClick={() => void immediateAction("restore")}><RotateCcw className="h-4 w-4" />Restore</Button>}
            {canDelete && tenant.status !== "deleted" && <Button type="button" variant="destructive" disabled={busy} onClick={() => void openDelete()}><Trash2 className="h-4 w-4" />Permanently Delete</Button>}
          </div>
        </div>

        {action && (
          <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5" role="dialog" aria-modal="true" aria-label={`${action} tenant`}>
            <h3 className="font-bold capitalize text-brand-900">{action} {tenant.name}</h3>
            {action === "delete" && (
              <>
                <p className="mt-2 text-sm font-semibold text-red-800">This action cannot be reversed. Tenant access and integrations will be permanently disabled. Legally required billing and audit records will be retained.</p>
                {preflight && <div className="mt-4 grid gap-2 text-xs text-brand-700 sm:grid-cols-3"><Fact label="Active Stripe subscriptions" value={String(preflight.activeStripeSubscriptions ?? 0)} /><Fact label="Unsettled payments" value={String(preflight.unsettledPayments ?? 0)} /><Fact label="Pending refunds" value={String(preflight.pendingRefunds ?? 0)} /><Fact label="Active users" value={String(preflight.activeUsers ?? 0)} /><Fact label="Tenant files" value={String(preflight.tenantOwnedFiles ?? 0)} /><Fact label="Active integrations" value={String(preflight.activeIntegrations ?? 0)} /></div>}
              </>
            )}
            <div className="mt-4 space-y-4">
              <Field label={`${action === "delete" ? "Deletion" : action === "suspend" ? "Suspension" : "Archive"} reason`} htmlFor="lifecycle-reason">
                <Textarea id="lifecycle-reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
              </Field>
              {action === "delete" && <Field label={`Type “${tenant.name}” to confirm`} htmlFor="tenant-confirmation-name"><Input id="tenant-confirmation-name" value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} /></Field>}
              <div className="flex gap-2">
                <Button type="button" variant={action === "delete" ? "destructive" : "primary"} disabled={busy || reason.trim().length < (action === "delete" ? 10 : 5) || (action === "delete" && confirmationName !== tenant.name)} onClick={() => void request({ action, reason: reason.trim(), ...(action === "delete" ? { confirmationName } : {}) })}>
                  {working ? "Processing..." : `Confirm ${action}`}
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => setAction(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-brand-500">{label}</p><p className="mt-1 font-semibold text-brand-900">{value}</p></div>;
}
