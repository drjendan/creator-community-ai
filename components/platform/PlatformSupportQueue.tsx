"use client";

import { useState } from "react";
import { Button, Card, Field, Select, Textarea } from "@/components/ui";

export type PlatformSupportRequest = {
  id: string;
  tenantName: string;
  requesterEmail: string;
  subject: string;
  body: string;
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

const statuses = ["open", "in_progress", "resolved", "closed"] as const;

export function PlatformSupportQueue({ initialRequests, canManage }: { initialRequests: PlatformSupportRequest[]; canManage: boolean }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function updateRequest(id: string, status: string) {
    setBusyId(id);
    setMessages((current) => ({ ...current, [id]: "" }));
    const response = await fetch("/api/platform/support", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, note: notes[id] ?? "" })
    });
    const result = await response.json().catch(() => ({})) as { error?: string; warning?: string; request?: { status: string; updated_at: string } };
    setBusyId("");
    if (!response.ok || !result.request) {
      setMessages((current) => ({ ...current, [id]: result.error ?? "Unable to update this request." }));
      return;
    }
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status: result.request!.status, updatedAt: result.request!.updated_at } : item));
    setNotes((current) => ({ ...current, [id]: "" }));
    setMessages((current) => ({ ...current, [id]: result.warning ?? "Support request updated." }));
  }

  if (requests.length === 0) return <Card><p className="text-sm text-brand-600">No support requests are recorded.</p></Card>;
  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold text-brand-900">{request.subject}</h2><span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold capitalize text-brand-700">{request.status.replaceAll("_", " ")}</span></div>
              <p className="mt-2 text-sm font-semibold text-brand-700">{request.tenantName} · {request.requesterEmail}</p>
              <p className="mt-1 text-xs text-brand-500">{request.category} · Submitted {new Date(request.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-brand-700">{request.body}</p>
          {canManage && <div className="mt-5 grid gap-3 border-t border-brand-100 pt-4 md:grid-cols-[220px_1fr_auto] md:items-end">
            <Field label="Status" htmlFor={`support-status-${request.id}`}>
              <Select id={`support-status-${request.id}`} value={request.status} onChange={(event) => setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: event.target.value } : item))}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</Select>
            </Field>
            <Field label="Internal resolution note" htmlFor={`support-note-${request.id}`}>
              <Textarea id={`support-note-${request.id}`} rows={2} maxLength={500} value={notes[request.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} />
            </Field>
            <Button type="button" disabled={busyId === request.id} onClick={() => updateRequest(request.id, request.status)}>{busyId === request.id ? "Saving…" : "Save"}</Button>
          </div>}
          {messages[request.id] && <p role="status" className="mt-3 text-sm font-semibold text-brand-700">{messages[request.id]}</p>}
        </Card>
      ))}
    </div>
  );
}
