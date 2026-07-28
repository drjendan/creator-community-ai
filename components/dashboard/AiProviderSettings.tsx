"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Sparkles } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type Provider = "openai" | "anthropic" | "google";
type SavedSettings = {
  provider: Provider;
  model: string;
  key_last_four: string;
  enabled: boolean;
  updated_at: string;
};

const providers: Record<Provider, { label: string; models: string[]; keyLabel: string }> = {
  openai: {
    label: "OpenAI",
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
    keyLabel: "OpenAI API key"
  },
  anthropic: {
    label: "Anthropic Claude",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
    keyLabel: "Anthropic API key"
  },
  google: {
    label: "Google Gemini",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
    keyLabel: "Google AI API key"
  }
};

export function AiProviderSettings({
  tenantId,
  tenantName,
  live
}: {
  tenantId: string;
  tenantName: string;
  live: boolean;
}) {
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState(providers.openai.models[0]);
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState<SavedSettings | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const providerDetails = useMemo(() => providers[provider], [provider]);

  useEffect(() => {
    if (!live) return;
    fetch(`/api/tenant-ai-settings?tenantId=${tenantId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load saved settings.");
        return response.json();
      })
      .then(({ settings }: { settings: SavedSettings | null }) => {
        if (!settings) return;
        setSaved(settings);
        setProvider(settings.provider);
        setModel(settings.model);
        setEnabled(settings.enabled);
      })
      .catch((error: Error) => setMessage(error.message));
  }, [live, tenantId]);

  function changeProvider(nextProvider: Provider) {
    setProvider(nextProvider);
    setModel(providers[nextProvider].models[0]);
    setMessage("");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live) {
      setMessage("Connect Supabase and set APP_ENCRYPTION_KEY to securely save tenant credentials.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/tenant-ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, provider, model, apiKey, enabled })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save AI settings.");
      setSaved(result.settings);
      setApiKey("");
      setMessage("AI provider settings saved securely.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save AI settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-strong">
          <Sparkles className="h-3.5 w-3.5" />
          Tenant-owned AI
        </div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">AI Tools</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-600">
          Connect {tenantName}&apos;s own AI provider account. Usage is billed directly by the selected provider.
        </p>
      </div>

      {!live && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800">
          Demo mode: the secure configuration form is visible, but credentials are not stored until Supabase and server encryption are configured.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <form className="space-y-5" onSubmit={saveSettings}>
            <div className="flex items-center gap-3 border-b border-brand-100 pb-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-100 text-accent-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-brand-900">Provider connection</h2>
                <p className="text-sm text-brand-500">Only tenant owners and administrators can change these settings.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="AI provider" htmlFor="provider">
                <Select
                  id="provider"
                  value={provider}
                  onChange={(event) => changeProvider(event.target.value as Provider)}
                >
                  {Object.entries(providers).map(([value, item]) => (
                    <option key={value} value={value}>{item.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Default model" htmlFor="model">
                <Select id="model" value={model} onChange={(event) => setModel(event.target.value)}>
                  {providerDetails.models.map((item) => <option key={item}>{item}</option>)}
                </Select>
              </Field>
            </div>

            <Field
              label={providerDetails.keyLabel}
              htmlFor="api-key"
              hint={saved ? `A key ending in ••••${saved.key_last_four} is saved. Leave this blank to keep it.` : "The key is encrypted before it is stored and is never shown again."}
            >
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={saved ? "Enter a new key to replace the saved key" : "Paste your API key"}
                  autoComplete="new-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-3 top-2.5 text-brand-500 hover:text-brand-900"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>

            <label className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="mt-1 h-4 w-4 accent-accent-600"
              />
              <span>
                <span className="block text-sm font-bold text-brand-900">Enable AI tools for this tenant</span>
                <span className="block text-xs text-brand-500">Turn this off to pause AI generation without deleting the saved connection.</span>
              </span>
            </label>

            {message && (
              <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                {message}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving securely…" : "Save provider settings"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <LockKeyhole className="h-6 w-6 text-accent-700" />
            <h2 className="mt-4 font-display text-lg font-bold text-brand-900">Credential security</h2>
            <ul className="mt-3 space-y-3 text-sm text-brand-600">
              <li>Encrypted with AES-256-GCM before database storage.</li>
              <li>Never returned to the browser after saving.</li>
              <li>Isolated by tenant and restricted to owners and administrators.</li>
              <li>Credential changes are recorded in the audit log.</li>
            </ul>
          </Card>
          {saved && (
            <Card className="border-success/30 bg-success-soft">
              <div className="flex items-center gap-2 text-success-strong">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold">Provider connected</span>
              </div>
              <p className="mt-2 text-sm text-brand-700">
                {providers[saved.provider].label} · {saved.model}
              </p>
              <p className="mt-1 text-xs text-brand-500">Key ending in ••••{saved.key_last_four}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


