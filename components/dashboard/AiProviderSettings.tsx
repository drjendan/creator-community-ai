"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { providerCatalog, providerIds, type AIProviderId } from "@/lib/ai/provider-catalog";
import type { AIConfigurationContext } from "@/lib/ai/permissions";

type SavedConfiguration = {
  id: string;
  provider: AIProviderId;
  model: string;
  key_last_four: string;
  enabled: boolean;
  is_default: boolean;
  verification_status: "not_verified" | "verified" | "failed" | "key_replacement_required";
  last_verified_at: string | null;
  last_verification_error_code: string | null;
  updated_at: string;
  updated_by_label: string;
};

function statusLabel(configuration?: SavedConfiguration) {
  if (!configuration) return "Not configured";
  if (!configuration.enabled) return "Disabled";
  if (configuration.verification_status === "verified") return "Connection verified";
  if (configuration.verification_status === "failed") return "Connection failed";
  if (configuration.verification_status === "key_replacement_required") return "Key replacement required";
  return "Configured";
}

export function AiProviderSettings({
  tenantId,
  tenantName,
  live,
  context = "tenant",
  returnTo
}: {
  tenantId?: string;
  tenantName: string;
  live: boolean;
  context?: AIConfigurationContext;
  returnTo?: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<AIProviderId>("openai");
  const [model, setModel] = useState(providerCatalog.openai.models[0].id);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [configurations, setConfigurations] = useState<SavedConfiguration[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);

  const selected = configurations.find((item) => item.provider === provider);
  const providerDetails = useMemo(() => providerCatalog[provider], [provider]);
  const query = useMemo(() => {
    const params = new URLSearchParams({ context });
    if (context === "platform" && tenantId) params.set("tenantId", tenantId);
    return params.toString();
  }, [context, tenantId]);

  const load = useCallback(async () => {
    if (!live) return;
    const response = await fetch(`/api/tenant-ai-settings?${query}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Unable to load AI provider settings.");
    setConfigurations(result.configurations ?? []);
    setCanWrite(result.canWrite !== false);
  }, [live, query]);

  useEffect(() => {
    void load().catch((error: Error) => setMessage(error.message));
  }, [load]);

  useEffect(() => {
    const current = configurations.find((item) => item.provider === provider);
    setModel(current?.model ?? providerCatalog[provider].models[0].id);
    setEnabled(current?.enabled ?? true);
    setIsDefault(current?.is_default ?? configurations.length === 0);
    setApiKey("");
  }, [provider, configurations]);

  function requestBody() {
    return { context, tenantId: context === "platform" ? tenantId : undefined, provider, model, apiKey, enabled, isDefault };
  }

  async function saveConfiguration(event?: FormEvent<HTMLFormElement>, options?: { quiet?: boolean }) {
    event?.preventDefault();
    if (!live || !canWrite) return false;
    setBusy("save");
    if (!options?.quiet) setMessage("");
    try {
      const response = await fetch("/api/tenant-ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody())
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save AI settings.");
      setApiKey("");
      if (!options?.quiet) setMessage("AI provider configuration saved securely.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save AI settings.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function testConnection() {
    if (!live || !canWrite) return;
    setBusy("test");
    setMessage("");
    try {
      const test = async (key: string) => {
        const response = await fetch("/api/tenant-ai-settings/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, tenantId: context === "platform" ? tenantId : undefined, provider, model, apiKey: key })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? result.error ?? "Connection failed.");
        return result;
      };
      await test(apiKey);
      if (apiKey) {
        const saved = await saveConfiguration(undefined, { quiet: true });
        if (!saved) return;
        await test("");
      }
      setMessage("Connection successful. The API key is valid and the selected model is available.");
      await load();
      if (returnTo) router.push(returnTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed.");
      await load().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  async function removeConfiguration() {
    if (!selected || !canWrite || !window.confirm(`Remove the ${providerDetails.label} configuration for ${tenantName}?`)) return;
    setBusy("remove");
    setMessage("");
    const params = new URLSearchParams({ context, provider });
    if (context === "platform" && tenantId) params.set("tenantId", tenantId);
    try {
      const response = await fetch(`/api/tenant-ai-settings?${params}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to remove the configuration.");
      setMessage(`${providerDetails.label} configuration removed.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove the configuration.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-strong"><Sparkles className="h-3.5 w-3.5" />Tenant-owned AI</div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">{context === "platform" ? "AI Configuration" : "AI Providers"}</h1>
        <p className="mt-2 max-w-3xl text-sm text-brand-600">
          {context === "platform"
            ? `Configure the AI providers used by ${tenantName}. Credentials are encrypted and scoped exclusively to this selected organization.`
            : "Connect your organization’s AI provider to enable AI-powered content, learning, and community features."}
        </p>
      </div>

      {!live && <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800">AI provider settings are unavailable until the secure server configuration is complete.</div>}
      {!canWrite && <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800"><ShieldAlert className="mr-2 inline h-4 w-4" />An UpNexx administrator manages credentials for this organization. You may view status but cannot change it.</div>}

      <div className="grid gap-4 md:grid-cols-3">
        {providerIds.map((id) => {
          const configuration = configurations.find((item) => item.provider === id);
          return (
            <button key={id} type="button" onClick={() => setProvider(id)} className={`rounded-2xl border bg-white p-5 text-left shadow-card transition ${provider === id ? "border-accent-500 ring-2 ring-accent-100" : "border-brand-200 hover:border-brand-300"}`}>
              <p className="font-display text-lg font-bold text-brand-900">{providerCatalog[id].label}</p>
              <p className="mt-2 text-sm font-semibold text-brand-600">{statusLabel(configuration)}</p>
              {configuration?.is_default && <span className="mt-3 inline-flex rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-800">Default provider</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <form className="space-y-5" onSubmit={saveConfiguration}>
            <div className="flex items-center gap-3 border-b border-brand-100 pb-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-100 text-accent-700"><KeyRound className="h-5 w-5" /></span>
              <div><h2 className="font-display text-xl font-bold text-brand-900">{providerDetails.label}</h2><p className="text-sm text-brand-500">Your organization&apos;s API key is used only within this workspace. It is encrypted and never displayed after saving.</p></div>
            </div>
            <Field label="Default model" htmlFor="model">
              <Select id="model" value={model} onChange={(event) => setModel(event.target.value)} disabled={!canWrite}>
                {providerDetails.models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </Select>
            </Field>
            <Field label={providerDetails.keyLabel} htmlFor="api-key" hint={selected ? `Configured — ending in ${selected.key_last_four}. Enter the complete new key to replace it.` : "The key is encrypted before storage and is never returned to the browser."}>
              <div className="relative">
                <Input id="api-key" type={showKey ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={selected ? "Enter a new key to replace the saved key" : "Paste your API key"} autoComplete="new-password" className="pr-12" disabled={!canWrite} />
                <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-3 top-2.5 text-brand-500 hover:text-brand-900" aria-label={showKey ? "Hide API key" : "Show API key"} disabled={!canWrite}>{showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!canWrite} className="mt-1 h-4 w-4 accent-accent-600" /><span><span className="block text-sm font-bold text-brand-900">Enabled</span><span className="block text-xs text-brand-500">Allow this provider to be used after verification.</span></span></label>
              <label className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4"><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} disabled={!canWrite} className="mt-1 h-4 w-4 accent-accent-600" /><span><span className="block text-sm font-bold text-brand-900">Default provider</span><span className="block text-xs text-brand-500">Use for tenant AI requests.</span></span></label>
            </div>
            {message && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{message}</p>}
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={!canWrite || busy !== null}>{busy === "save" ? "Saving securely…" : selected ? "Save Configuration" : "Add Provider"}</Button>
              <Button type="button" variant="secondary" onClick={() => void testConnection()} disabled={!canWrite || busy !== null || (!selected && !apiKey)}>{busy === "test" ? <><RefreshCw className="h-4 w-4 animate-spin" />Testing…</> : "Test Connection"}</Button>
              {selected && <Button type="button" variant="destructive" onClick={() => void removeConfiguration()} disabled={!canWrite || busy !== null}><Trash2 className="h-4 w-4" />Remove Configuration</Button>}
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card><LockKeyhole className="h-6 w-6 text-accent-700" /><h2 className="mt-4 font-display text-lg font-bold text-brand-900">Credential security</h2><ul className="mt-3 space-y-3 text-sm text-brand-600"><li>Encrypted with AES-256-GCM and a unique nonce.</li><li>Never returned to the browser after saving.</li><li>Scoped to this organization and provider.</li><li>Changes and tests are recorded without credential values.</li></ul></Card>
          {selected && <Card className={selected.verification_status === "verified" && selected.enabled ? "border-success/30 bg-success-soft" : ""}><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-accent-700" /><span className="font-bold text-brand-900">{statusLabel(selected)}</span></div><p className="mt-3 text-sm text-brand-700">{providerDetails.label} · {selected.model}</p><p className="mt-1 text-xs text-brand-500">Configured — ending in {selected.key_last_four}</p><p className="mt-1 text-xs text-brand-500">Last verified: {selected.last_verified_at ? new Date(selected.last_verified_at).toLocaleString() : "Not yet verified"}</p><p className="mt-1 text-xs text-brand-500">Last updated by: {selected.updated_by_label}</p></Card>}
        </div>
      </div>
    </div>
  );
}
