"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";

type Configuration = {
  masked_key: string;
  from_name: string;
  from_email: string;
  reply_to_email?: string;
  connection_status: string;
  verification_status: string;
  last_tested_at?: string;
  last_test_result?: string;
  is_active: boolean;
};

type ProviderAction =
  | "save"
  | "test"
  | "send_test"
  | "disable"
  | "remove";

export function EmailProviderSettings() {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/communications/provider", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result.configuration) {
          setConfiguration(result.configuration);
          setFromName(result.configuration.from_name);
          setFromEmail(result.configuration.from_email);
          setReplyToEmail(result.configuration.reply_to_email ?? "");
        }
      })
      .catch(() => setMessage("Unable to load the provider configuration."));
  }, []);

  async function submit(action: ProviderAction) {
    if (
      action === "remove" &&
      !window.confirm(
        "Remove this organization’s saved Resend credential and sender configuration?"
      )
    ) {
      return;
    }
    setBusy(action);
    setMessage("");
    const response = await fetch("/api/communications/provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: apiKey || undefined,
        fromName,
        fromEmail,
        replyToEmail,
        testRecipient: testRecipient || undefined,
        action
      })
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? action === "test"
          ? "Connection successful."
          : action === "send_test"
            ? "Test email accepted by Resend."
            : action === "disable"
              ? "Email provider disabled."
              : action === "remove"
                ? "Email provider configuration removed."
                : "Provider configuration saved securely."
        : result.error ?? "The provider action failed."
    );
    if (response.ok && action !== "send_test") window.location.reload();
    setBusy("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">
          Email Provider
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          Connect this organization&apos;s Resend account. Provider charges are
          paid directly by the organization.
        </p>
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-brand-900">
              Resend
            </h2>
            <p className="mt-1 text-sm text-brand-500">
              {configuration
                ? `Saved credential ${configuration.masked_key}`
                : "No credential saved"}
            </p>
          </div>
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold capitalize text-brand-700">
            {configuration?.connection_status?.replaceAll("_", " ") ??
              "Not configured"}
          </span>
        </div>
        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void submit("save");
          }}
          className="mt-6 grid gap-5 md:grid-cols-2"
        >
          <Field
            label={configuration ? "Replace API key" : "API key"}
            htmlFor="resend-key"
            hint={
              configuration
                ? "Leave blank to keep the saved encrypted credential."
                : "The key is encrypted before storage and never returned to the browser."
            }
          >
            <Input
              id="resend-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="From name" htmlFor="from-name" required>
            <Input
              id="from-name"
              value={fromName}
              onChange={(event) => setFromName(event.target.value)}
              required
            />
          </Field>
          <Field label="From email" htmlFor="from-email" required>
            <Input
              id="from-email"
              type="email"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Reply-to email" htmlFor="reply-email">
            <Input
              id="reply-email"
              type="email"
              value={replyToEmail}
              onChange={(event) => setReplyToEmail(event.target.value)}
            />
          </Field>
          <Field label="Test recipient" htmlFor="test-recipient">
            <Input
              id="test-recipient"
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="submit" disabled={Boolean(busy)}>
              {busy === "save" ? "Saving…" : "Save securely"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() => void submit("test")}
            >
              {busy === "test" ? "Testing…" : "Test connection"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(busy) || !testRecipient}
              onClick={() => void submit("send_test")}
            >
              {busy === "send_test" ? "Sending…" : "Send test email"}
            </Button>
          </div>
        </form>
        {configuration && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-brand-100 pt-5">
            {configuration.is_active && (
              <Button
                type="button"
                variant="destructive"
                disabled={Boolean(busy)}
                onClick={() => void submit("disable")}
              >
                Disable provider
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() => void submit("remove")}
            >
              Remove configuration
            </Button>
          </div>
        )}
        {message && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700"
          >
            {message}
          </p>
        )}
      </Card>
    </div>
  );
}
