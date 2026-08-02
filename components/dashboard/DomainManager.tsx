"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Globe2, RefreshCw } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";

type Domain = {
  id: string; hostname: string; domain_type: string; status: string; ssl_status: string;
  verification_record_name: string | null; verification_record_value: string | null;
  dns_target: string | null; failure_reason: string | null; activated_at: string | null;
};
type Attempt = { id: string; domain_id: string; check_type: string; status: string; evidence_reference: string; performed_at: string };
type Payload = { domains: Domain[]; attempts: Attempt[]; dnsTarget: string };

export function DomainManager() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/domains", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load domains."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(body: Record<string, unknown>) {
    setError(""); setMessage("");
    const response = await fetch("/api/domains", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Unable to update the domain."); return; }
    setMessage("Domain request updated. DNS and SSL remain unverified until platform checks pass.");
    await load();
  }
  if (!data) return <Card><p className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Loading domains...</p>{error && <span className="text-red-700"> {error}</span>}</Card>;
  const custom = data.domains.filter((item) => item.domain_type === "custom");
  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Production domain lifecycle</p><h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-extrabold"><Globe2 className="h-7 w-7" /> Custom Domains</h1><p className="mt-2 text-sm text-brand-600">Request a hostname and publish the exact DNS records below. UpNexx operations must independently verify ownership, routing, and SSL before activation.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">{message}</p>}
    <Card><h2 className="font-display text-xl font-bold">Request a custom hostname</h2><form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit({ action: "create", hostname: form.get("hostname") }); }}><Input required name="hostname" aria-label="Custom hostname" placeholder="community.example.com" /><Button type="submit">Create DNS challenge</Button></form></Card>
    <div className="space-y-4">{custom.length ? custom.map((domain) => <Card key={domain.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{domain.hostname}</h2><p className="mt-1 text-sm text-brand-600">Lifecycle: <strong>{domain.status.replaceAll("_", " ")}</strong> · SSL: <strong>{domain.ssl_status}</strong></p></div><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase">{domain.status}</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-brand-100 p-3"><p className="text-xs font-bold uppercase text-brand-500">Ownership TXT name</p><p className="mt-1 break-all font-mono text-sm">{domain.verification_record_name}</p><p className="mt-3 text-xs font-bold uppercase text-brand-500">TXT value</p><p className="mt-1 break-all font-mono text-sm">{domain.verification_record_value}</p></div><div className="rounded-xl border border-brand-100 p-3"><p className="text-xs font-bold uppercase text-brand-500">Traffic record</p><p className="mt-1 text-sm">CNAME <span className="font-mono">{domain.hostname}</span> to <span className="font-mono">{domain.dns_target || data.dnsTarget}</span>.</p><p className="mt-3 text-xs text-brand-500">Do not remove the managed subdomain. It remains the rollback path.</p></div></div>
      {domain.failure_reason && <p className="mt-3 text-sm font-semibold text-red-700">{domain.failure_reason}</p>}
      <div className="mt-4 flex flex-wrap gap-2">{["pending","failed","inactive"].includes(domain.status) && <Button type="button" variant="secondary" onClick={() => void submit({ action: "rotate", id: domain.id })}>Rotate ownership token</Button>}{domain.status !== "active" && <Button type="button" variant="secondary" onClick={() => void submit({ action: "deactivate", id: domain.id })}>Deactivate request</Button>}</div>
      <div className="mt-4 border-t border-brand-100 pt-3"><p className="text-sm font-bold">Verification history</p>{data.attempts.filter((item) => item.domain_id === domain.id).length ? data.attempts.filter((item) => item.domain_id === domain.id).map((item) => <p key={item.id} className="mt-2 text-xs text-brand-500">{item.check_type.replaceAll("_", " ")} · {item.status} · {new Date(item.performed_at).toLocaleString()} · {item.evidence_reference}</p>) : <p className="mt-2 text-xs text-brand-500">No production verification attempts recorded.</p>}</div>
    </Card>) : <Card><p className="text-sm text-brand-600">No custom-domain request exists yet.</p></Card>}</div>
  </div>;
}
