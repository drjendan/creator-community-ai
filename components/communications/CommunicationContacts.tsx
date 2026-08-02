"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Edit3, Plus, RefreshCw, Search, X } from "lucide-react";
import { Button, Card, Field, Input } from "@/components/ui";

type Contact = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  tags: string[];
};

export function CommunicationContacts() {
  const [items, setItems] = useState<Contact[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/communications/contacts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Unable to load contacts.");
      else setItems(result.items ?? []);
    } catch {
      setError("Unable to load contacts. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => `${item.first_name} ${item.last_name} ${item.email} ${(item.tags ?? []).join(" ")}`.toLowerCase().includes(normalized));
  }, [items, query]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/communications/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        email: data.get("email"),
        first_name: data.get("firstName"),
        last_name: data.get("lastName"),
        status: "active",
        tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean)
      })
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to save the contact.");
    else {
      setMessage(`Contact ${editing ? "updated" : "added"}.`);
      setFormOpen(false);
      setEditing(null);
      await load();
    }
    setSaving(false);
  }

  async function archive(item: Contact) {
    if (!window.confirm(`Archive ${item.email}?`)) return;
    const response = await fetch(`/api/communications/contacts?id=${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to archive the contact.");
    else {
      setMessage("Contact archived.");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl font-extrabold text-brand-900">Contacts</h1><p className="mt-2 text-sm text-brand-600">Manage tenant recipients, tags, subscription state, and segments.</p></div><Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add contact</Button></div>
      {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {formOpen && <Card><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-bold">{editing ? "Edit" : "Add"} contact</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Close contact form"><X className="h-5 w-5" /></button></div><form onSubmit={save} className="grid gap-5 md:grid-cols-2"><Field label="Email" htmlFor="contact-email" required><Input id="contact-email" name="email" type="email" defaultValue={editing?.email} required /></Field><Field label="Tags" htmlFor="contact-tags" hint="Comma-separated"><Input id="contact-tags" name="tags" defaultValue={editing?.tags?.join(", ")} /></Field><Field label="First name" htmlFor="contact-first"><Input id="contact-first" name="firstName" defaultValue={editing?.first_name} /></Field><Field label="Last name" htmlFor="contact-last"><Input id="contact-last" name="lastName" defaultValue={editing?.last_name} /></Field><div className="flex gap-3 md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save contact"}</Button><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button></div></form></Card>}
      <Card><label className="flex items-center gap-3 rounded-lg border border-brand-200 px-3"><Search className="h-4 w-4 text-brand-400" /><Input aria-label="Search contacts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or tag" className="border-0 shadow-none focus:ring-0" /></label></Card>
      <Card padded={false} className="overflow-hidden">{loading ? <p className="flex items-center gap-2 p-6 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading contacts…</p> : filtered.length === 0 ? <div className="p-10 text-center"><p className="font-display text-xl font-bold text-brand-900">{items.length ? "No contacts match your search" : "No contacts yet"}</p><p className="mt-2 text-sm text-brand-500">Add a contact to begin building a tenant audience.</p></div> : <div className="divide-y divide-brand-100">{filtered.map((item) => <div key={item.id} className="flex items-center gap-4 p-5"><div className="min-w-0 flex-1"><p className="font-bold text-brand-900">{[item.first_name, item.last_name].filter(Boolean).join(" ") || item.email}</p><p className="text-sm text-brand-500">{item.email}</p>{item.tags?.length > 0 && <p className="mt-2 text-xs text-accent-700">{item.tags.join(" · ")}</p>}</div><button type="button" onClick={() => { setEditing(item); setFormOpen(true); }} aria-label={`Edit ${item.email}`} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void archive(item)} aria-label={`Archive ${item.email}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Archive className="h-4 w-4" /></button></div>)}</div>}</Card>
    </div>
  );
}
