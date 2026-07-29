/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

export function MemberMessages({ tenantSlug, initialMessages }: { tenantSlug: string; initialMessages: any[] }) {
  const [messages, setMessages] = useState(initialMessages);
  async function update(recipientId: string, values: { read?: boolean; archived?: boolean }) {
    const response = await fetch("/api/member/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantSlug, recipientId, ...values }) });
    if (response.ok) setMessages((current) => values.archived ? current.filter((item) => item.recipient_id !== recipientId) : current.map((item) => item.recipient_id === recipientId ? { ...item, read_at: values.read ? new Date().toISOString() : null } : item));
  }
  return <div className="space-y-6"><div><h1 className="font-display text-3xl font-extrabold text-brand-900">Messages</h1><p className="mt-2 text-sm text-brand-600">Messages sent to you by this organization.</p></div>{messages.length ? messages.map((message) => <Card key={message.recipient_id} className={!message.read_at ? "border-accent-300" : ""}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold text-brand-900">{message.subject}</h2><p className="mt-1 text-xs text-brand-500">{new Date(message.sent_at || message.created_at).toLocaleString()}</p></div>{!message.read_at && <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold text-accent-800">Unread</span>}</div><p className="mt-4 whitespace-pre-wrap text-brand-700">{message.body}</p><div className="mt-5 flex gap-2">{!message.read_at && <Button type="button" size="sm" onClick={() => void update(message.recipient_id, { read: true })}>Mark read</Button>}<Button type="button" size="sm" variant="secondary" onClick={() => void update(message.recipient_id, { archived: true })}>Archive</Button></div></Card>) : <Card><p className="font-bold text-brand-900">No organization messages</p><p className="mt-2 text-sm text-brand-600">Messages addressed to you will appear here.</p></Card>}</div>;
}
