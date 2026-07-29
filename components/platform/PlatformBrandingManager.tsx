/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";

const defaults = {
  platformName: "UpNexx",
  tagline: "The Intelligent Content, Learning & Community Platform",
  logoUrl: "",
  squareIconUrl: "",
  faviconUrl: "",
  primaryColor: "#0b1533",
  accentColor: "#7c3aed",
  backgroundColor: "#f8fafc",
  textColor: "#0f172a",
  supportEmail: "",
  websiteUrl: "",
  footerText: ""
};

export function PlatformBrandingManager() {
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/platform-branding", { cache: "no-store" }).then(
      async (response) => {
        const result = await response.json();
        if (!response.ok) {
          setMessage(result.error ?? "Unable to load platform branding.");
          return;
        }
        const value = result.branding ?? {};
        setForm({
          platformName: value.platform_name ?? defaults.platformName,
          tagline: value.tagline ?? defaults.tagline,
          logoUrl: value.logo_url ?? "",
          squareIconUrl: value.square_icon_url ?? "",
          faviconUrl: value.favicon_url ?? "",
          primaryColor: value.primary_color ?? defaults.primaryColor,
          accentColor: value.accent_color ?? defaults.accentColor,
          backgroundColor: value.background_color ?? defaults.backgroundColor,
          textColor: value.text_color ?? defaults.textColor,
          supportEmail: value.support_email ?? "",
          websiteUrl: value.website_url ?? "",
          footerText: value.footer_text ?? ""
        });
      }
    );
  }, []);

  function update(key: keyof typeof defaults, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(key: "logoUrl" | "squareIconUrl" | "faviconUrl", file: File) {
    setBusy(true);
    const data = new FormData();
    data.set("file", file);
    data.set("scope", "platform");
    const response = await fetch("/api/platform-assets", {
      method: "POST",
      body: data
    });
    const result = await response.json();
    if (response.ok) {
      update(key, result.url);
      setMessage("Brand image uploaded. Save settings to apply it.");
    } else {
      setMessage(result.error ?? "Unable to upload the image.");
    }
    setBusy(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/platform-branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? "Platform branding saved. Refresh to see it in the administration shell."
        : result.error ?? "Unable to save platform branding."
    );
    setBusy(false);
  }

  const imageField = (
    label: string,
    key: "logoUrl" | "squareIconUrl" | "faviconUrl"
  ) => (
    <Field label={label} htmlFor={`platform-${key}`}>
      <Input
        id={`platform-${key}`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/x-icon"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(key, file);
        }}
      />
      {form[key] && (
        <div className="mt-2 flex items-center gap-3">
          <img
            src={form[key]}
            alt={`${label} preview`}
            className="h-16 w-28 rounded-lg border border-brand-200 object-contain"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => update(key, "")}
          >
            Remove
          </Button>
        </div>
      )}
    </Field>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">
          Platform Settings
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          Customize the UpNexx platform identity used in platform
          administration.
        </p>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700"
        >
          {message}
        </p>
      )}
      <form onSubmit={save} className="space-y-6">
        <Card>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Platform identity
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Platform name" htmlFor="platform-name" required>
              <Input
                id="platform-name"
                value={form.platformName}
                onChange={(event) => update("platformName", event.target.value)}
                required
              />
            </Field>
            <Field label="Tagline" htmlFor="platform-tagline">
              <Input
                id="platform-tagline"
                value={form.tagline}
                onChange={(event) => update("tagline", event.target.value)}
              />
            </Field>
            {imageField("Full platform logo", "logoUrl")}
            {imageField("Square platform icon", "squareIconUrl")}
            {imageField("Favicon", "faviconUrl")}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Platform colors and preview
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                "primaryColor",
                "accentColor",
                "backgroundColor",
                "textColor"
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={key.replace("Color", " color")}
                htmlFor={`platform-${key}`}
              >
                <Input
                  id={`platform-${key}`}
                  type="color"
                  value={form[key]}
                  onChange={(event) => update(key, event.target.value)}
                  className="h-12"
                />
              </Field>
            ))}
          </div>
          <div
            className="mt-6 rounded-xl p-6"
            style={{
              backgroundColor: form.backgroundColor,
              color: form.textColor
            }}
          >
            <div className="flex items-center gap-4">
              {form.logoUrl && (
                <img
                  src={form.logoUrl}
                  alt=""
                  className="h-14 max-w-52 object-contain"
                />
              )}
              <div>
                <h3
                  className="font-display text-2xl font-extrabold"
                  style={{ color: form.primaryColor }}
                >
                  {form.platformName}
                </h3>
                <p className="mt-1 text-sm">{form.tagline}</p>
              </div>
            </div>
            <span
              className="mt-5 inline-block rounded-lg px-4 py-2 font-bold text-white"
              style={{ backgroundColor: form.accentColor }}
            >
              Primary action
            </span>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Support and footer
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Support email" htmlFor="platform-support">
              <Input
                id="platform-support"
                type="email"
                value={form.supportEmail}
                onChange={(event) => update("supportEmail", event.target.value)}
              />
            </Field>
            <Field label="Website" htmlFor="platform-website">
              <Input
                id="platform-website"
                type="url"
                value={form.websiteUrl}
                onChange={(event) => update("websiteUrl", event.target.value)}
              />
            </Field>
            <Field
              label="Platform footer text"
              htmlFor="platform-footer"
              className="md:col-span-2"
            >
              <Textarea
                id="platform-footer"
                value={form.footerText}
                onChange={(event) => update("footerText", event.target.value)}
              />
            </Field>
          </div>
        </Card>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save platform branding"}
        </Button>
      </form>
    </div>
  );
}
