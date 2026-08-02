"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, History, RefreshCw, Save, Upload } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { defaultLegalContent, legalDocumentLabels, type LegalDocumentType } from "@/lib/legal-content";

type DocumentRow = { id: string; document_type: LegalDocumentType; title: string; current_version_id?: string | null };
type VersionRow = { id: string; document_id: string; version: string; content: string; status: string; effective_at: string; created_at: string };
type Profile = { business_name?: string; business_address?: string; support_email?: string };

export function LegalCenterEditor({ scope }: { scope: "platform" | "tenant" }) {
  const types: LegalDocumentType[] = scope === "platform" ? ["terms", "privacy", "cookies", "acceptable_use"] : ["terms", "privacy", "refund"];
  const [type, setType] = useState<LegalDocumentType>(types[0]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [version, setVersion] = useState("");
  const [content, setContent] = useState(defaultLegalContent[types[0]]);
  const [effectiveAt, setEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/legal/${scope}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Unable to load the Legal Center.");
      else {
        setDocuments(result.documents ?? []);
        setVersions(result.versions ?? []);
        setProfile(result.profile ?? {});
      }
    } catch {
      setError("Unable to load the Legal Center. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  const selectedDocument = documents.find((document) => document.document_type === type);
  const selectedVersions = useMemo(() => versions.filter((item) => item.document_id === selectedDocument?.id), [selectedDocument?.id, versions]);

  useEffect(() => {
    const current = selectedVersions.find((item) => item.id === selectedDocument?.current_version_id) ?? selectedVersions[0];
    setVersion(current?.version ?? "");
    setContent(current?.content ?? defaultLegalContent[type]);
    setEffectiveAt((current?.effective_at ?? new Date().toISOString()).slice(0, 16));
  }, [type, selectedDocument?.current_version_id, selectedVersions]);

  async function save(action: "save" | "publish") {
    setSaving(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/legal/${scope}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, documentType: type, version, content, effectiveAt: new Date(effectiveAt).toISOString() })
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to save the legal document.");
    else {
      setMessage(action === "publish" ? `${legalDocumentLabels[type]} published.` : "Draft saved.");
      await load();
    }
    setSaving(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/legal/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "profile", businessName: data.get("businessName"), businessAddress: data.get("businessAddress"), supportEmail: data.get("supportEmail") })
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to save the legal profile.");
    else {
      setProfile(result.profile);
      setMessage("Tenant legal profile saved.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-extrabold text-brand-900">{scope === "platform" ? "Platform Legal Center" : "Legal Settings"}</h1><p className="mt-2 max-w-3xl text-sm text-brand-600">{scope === "platform" ? "Publish and retain versioned UpNexx policies with effective dates." : "Configure tenant policies and business contact information. Unconfigured policies automatically use the current UpNexx defaults."}</p></div>
      {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {scope === "tenant" && <Card><h2 className="font-display text-xl font-bold text-brand-900">Business information</h2><form onSubmit={saveProfile} className="mt-5 grid gap-5 md:grid-cols-2"><Field label="Business name" htmlFor="legal-business" required><Input id="legal-business" name="businessName" defaultValue={profile.business_name} required /></Field><Field label="Support email" htmlFor="legal-support" required><Input id="legal-support" name="supportEmail" type="email" defaultValue={profile.support_email} required /></Field><Field label="Business address" htmlFor="legal-address" className="md:col-span-2"><Textarea id="legal-address" name="businessAddress" defaultValue={profile.business_address} /></Field><div className="md:col-span-2"><Button type="submit" variant="secondary" disabled={saving}>Save business information</Button></div></form></Card>}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          {loading ? <p className="flex items-center gap-2 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading legal documents…</p> : <div className="space-y-5"><Field label="Document" htmlFor="legal-document"><Select id="legal-document" value={type} onChange={(event) => setType(event.target.value as LegalDocumentType)}>{types.map((item) => <option key={item} value={item}>{legalDocumentLabels[item]}</option>)}</Select></Field><div className="grid gap-5 md:grid-cols-2"><Field label="Version" htmlFor="legal-version" hint="Example: 2026.08 or 2.1"><Input id="legal-version" value={version} onChange={(event) => setVersion(event.target.value)} required /></Field><Field label="Effective date" htmlFor="legal-effective"><Input id="legal-effective" type="datetime-local" value={effectiveAt} onChange={(event) => setEffectiveAt(event.target.value)} required /></Field></div><Field label="Upload policy text" htmlFor="legal-upload" hint="Plain text, Markdown, or HTML text files up to 1 MB"><Input id="legal-upload" type="file" accept=".txt,.md,.html,text/plain,text/markdown,text/html" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1024 * 1024) { setError("Policy uploads must be 1 MB or smaller."); return; } void file.text().then(setContent); }} /></Field><Field label="Policy text" htmlFor="legal-content" hint="Use a heading followed by its paragraphs. Blank lines separate sections."><Textarea id="legal-content" value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[520px] font-mono text-sm" /></Field><div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" disabled={saving || !version} onClick={() => void save("save")}><Save className="h-4 w-4" /> Save draft</Button><Button type="button" disabled={saving || !version} onClick={() => void save("publish")}><CalendarDays className="h-4 w-4" /> Publish version</Button><span className="inline-flex items-center gap-2 text-xs text-brand-500"><Upload className="h-4 w-4" /> Uploads populate the editable policy field.</span></div></div>}
        </Card>
        <Card><div className="flex items-center gap-2"><History className="h-5 w-5 text-accent-700" /><h2 className="font-display text-xl font-bold text-brand-900">Version history</h2></div>{selectedVersions.length ? <div className="mt-5 space-y-3">{selectedVersions.map((item) => <button key={item.id} type="button" onClick={() => { setVersion(item.version); setContent(item.content); setEffectiveAt(item.effective_at.slice(0, 16)); }} className="w-full rounded-xl border border-brand-200 p-4 text-left hover:border-accent-300"><div className="flex justify-between gap-3"><span className="font-bold text-brand-900">{item.version}</span><span className="text-xs font-bold capitalize text-accent-700">{item.status}</span></div><p className="mt-2 text-xs text-brand-500">Effective {new Date(item.effective_at).toLocaleDateString()}</p></button>)}</div> : <p className="mt-5 text-sm text-brand-500">No saved versions yet.</p>}</Card>
      </div>
    </div>
  );
}
