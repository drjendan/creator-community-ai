/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";

const defaults = {
  name: "",
  shortName: "",
  logoUrl: "",
  logoPath: "",
  squareIconUrl: "",
  squareIconPath: "",
  faviconUrl: "",
  faviconPath: "",
  heroImageUrl: "",
  heroImagePath: "",
  memberWelcomeImageUrl: "",
  memberWelcomeImagePath: "",
  emailLogoUrl: "",
  emailLogoPath: "",
  primaryColor: "#2d2119",
  secondaryColor: "#7b5d45",
  accentColor: "#d6b98c",
  backgroundColor: "#f8f6f1",
  textColor: "#1f2937",
  buttonColor: "#7c3aed",
  linkColor: "#6d28d9",
  emailHeaderText: "",
  emailFooterText: "",
  welcomeHeadline: "",
  welcomeMessage: "",
  dashboardGreeting: "",
  memberTerm: "Member",
  supportEmail: "",
  supportPhone: "",
  websiteUrl: "",
  footerText: ""
};

type BrandingForm = typeof defaults;
type ImageKey =
  | "logoUrl"
  | "squareIconUrl"
  | "faviconUrl"
  | "heroImageUrl"
  | "memberWelcomeImageUrl"
  | "emailLogoUrl";
type PathKey =
  | "logoPath"
  | "squareIconPath"
  | "faviconPath"
  | "heroImagePath"
  | "memberWelcomeImagePath"
  | "emailLogoPath";

const imagePath: Partial<Record<ImageKey, PathKey>> = {
  logoUrl: "logoPath",
  squareIconUrl: "squareIconPath",
  faviconUrl: "faviconPath",
  heroImageUrl: "heroImagePath",
  memberWelcomeImageUrl: "memberWelcomeImagePath",
  emailLogoUrl: "emailLogoPath"
};

function fromResponse(result: Record<string, any>): BrandingForm {
  const b = result.branding ?? {};
  return {
    ...defaults,
    name: result.tenant?.name ?? "",
    shortName: b.organization_short_name ?? "",
    logoUrl: b.logo_url ?? "",
    logoPath: b.logo_storage_path ?? "",
    squareIconUrl: b.square_icon_url ?? "",
    squareIconPath: b.square_icon_storage_path ?? "",
    faviconUrl: b.favicon_url ?? "",
    faviconPath: b.favicon_storage_path ?? "",
    heroImageUrl: b.hero_image_url ?? "",
    heroImagePath: b.hero_image_storage_path ?? "",
    memberWelcomeImageUrl: b.member_welcome_image_url ?? "",
    memberWelcomeImagePath: b.member_welcome_image_storage_path ?? "",
    emailLogoUrl: b.email_logo_url ?? "",
    emailLogoPath: b.email_logo_storage_path ?? "",
    primaryColor: b.primary_color ?? defaults.primaryColor,
    secondaryColor: b.secondary_color ?? defaults.secondaryColor,
    accentColor: b.accent_color ?? defaults.accentColor,
    backgroundColor: b.background_color ?? defaults.backgroundColor,
    textColor: b.text_color ?? defaults.textColor,
    buttonColor: b.button_color ?? defaults.buttonColor,
    linkColor: b.link_color ?? defaults.linkColor,
    emailHeaderText: b.email_header_text ?? "",
    emailFooterText: b.email_footer_text ?? "",
    welcomeHeadline: b.welcome_headline ?? "",
    welcomeMessage: b.welcome_message ?? "",
    dashboardGreeting: b.member_dashboard_greeting ?? "",
    memberTerm: b.member_term ?? "Member",
    supportEmail: b.support_email ?? "",
    supportPhone: b.support_phone ?? "",
    websiteUrl: b.website_url ?? "",
    footerText: b.footer_text ?? ""
  };
}

export function BrandingManager({
  endpoint = "/api/branding",
  uploadEndpoint = "/api/tenant-assets",
  tenantId
}: {
  endpoint?: string;
  uploadEndpoint?: string;
  tenantId?: string;
} = {}) {
  const [form, setForm] = useState<BrandingForm>(defaults);
  const [saved, setSaved] = useState<BrandingForm>(defaults);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved]
  );

  const load = useCallback(async () => {
    setBusy(true);
    const response = await fetch(endpoint, { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      const next = fromResponse(result);
      setForm(next);
      setSaved(next);
      setMessage("");
    } else {
      setMessage(result.error ?? "Unable to load branding.");
    }
    setBusy(false);
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function upload(key: ImageKey, file: File) {
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.set("file", file);
    data.set("folder", "branding");
    if (tenantId) {
      data.set("scope", "tenant");
      data.set("tenantId", tenantId);
    }
    const response = await fetch(uploadEndpoint, { method: "POST", body: data });
    const result = await response.json();
    if (response.ok) {
      setForm((current) => ({
        ...current,
        [key]: result.url,
        ...(imagePath[key] ? { [imagePath[key]!]: result.path } : {})
      }));
      setMessage("Image uploaded. Select Save changes to publish it.");
    } else {
      setMessage(result.error ?? "Upload failed.");
    }
    setBusy(false);
  }

  function removeImage(key: ImageKey) {
    setForm((current) => ({
      ...current,
      [key]: "",
      ...(imagePath[key] ? { [imagePath[key]!]: "" } : {})
    }));
  }

  async function saveChanges(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();
    if (response.ok) {
      setSaved(form);
      setMessage("Branding saved and published throughout the workspace.");
    } else {
      setMessage(result.error ?? "Unable to save branding.");
    }
    setBusy(false);
  }

  function imageField(label: string, key: ImageKey) {
    const hasImage = Boolean(form[key]);
    const assetLabel = label.replace(/^Upload /, "");
    return (
      <Field label={label} htmlFor={`brand-${key}`}>
        <Input
          id={`brand-${key}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(key, file);
            event.currentTarget.value = "";
          }}
        />
        <p className="mt-1 text-xs text-brand-500">
          PNG, JPG, or WebP; maximum 5 MB.
        </p>
        {hasImage && (
          <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
            <img
              src={form[key]}
              alt={`${label} preview`}
              className="h-20 max-w-full object-contain"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <label
                htmlFor={`brand-${key}`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700"
              >
                <ImagePlus className="h-4 w-4" />
                Replace {assetLabel}
              </label>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => removeImage(key)}
              >
                <Trash2 className="h-4 w-4" />
                Remove {assetLabel}
              </Button>
            </div>
          </div>
        )}
      </Field>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">
          Branding
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          Customize the organization, member, public-page, and email identity.
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
      <form onSubmit={saveChanges} className="space-y-6">
        <Card>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Organization identity
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Organization display name" htmlFor="brand-name" required>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
            </Field>
            <Field label="Short organization name" htmlFor="brand-short-name">
              <Input
                id="brand-short-name"
                value={form.shortName}
                maxLength={40}
                onChange={(event) => update("shortName", event.target.value)}
              />
            </Field>
            {imageField("Upload Logo", "logoUrl")}
            {imageField("Square icon", "squareIconUrl")}
            {imageField("Hero image", "heroImageUrl")}
            {imageField("Email logo", "emailLogoUrl")}
            {imageField("Favicon", "faviconUrl")}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Brand colors
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                "primaryColor",
                "secondaryColor",
                "accentColor",
                "backgroundColor",
                "textColor",
                "buttonColor",
                "linkColor"
              ] as const
            ).map((key) => (
              <Field
                key={key}
                label={key.replace("Color", " color")}
                htmlFor={`brand-${key}`}
              >
                <Input
                  id={`brand-${key}`}
                  type="color"
                  value={form[key]}
                  onChange={(event) => update(key, event.target.value)}
                  className="h-12"
                />
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-bold text-brand-900">
            Member-facing language
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Welcome headline" htmlFor="welcome-headline">
              <Input
                id="welcome-headline"
                value={form.welcomeHeadline}
                onChange={(event) => update("welcomeHeadline", event.target.value)}
              />
            </Field>
            <Field label="Member dashboard greeting" htmlFor="dashboard-greeting">
              <Input
                id="dashboard-greeting"
                value={form.dashboardGreeting}
                onChange={(event) => update("dashboardGreeting", event.target.value)}
              />
            </Field>
            <Field
              label="Welcome message"
              htmlFor="welcome-message"
              className="md:col-span-2"
            >
              <Textarea
                id="welcome-message"
                value={form.welcomeMessage}
                onChange={(event) => update("welcomeMessage", event.target.value)}
              />
            </Field>
            <Field label="Support email" htmlFor="support-email">
              <Input
                id="support-email"
                type="email"
                value={form.supportEmail}
                onChange={(event) => update("supportEmail", event.target.value)}
              />
            </Field>
            <Field label="Organization website" htmlFor="website-url">
              <Input
                id="website-url"
                type="url"
                value={form.websiteUrl}
                onChange={(event) => update("websiteUrl", event.target.value)}
              />
            </Field>
            <Field label="Footer text" htmlFor="site-footer" className="md:col-span-2">
              <Textarea
                id="site-footer"
                value={form.footerText}
                onChange={(event) => update("footerText", event.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-brand-900">
              Live preview
            </h2>
            <span className="text-xs font-bold uppercase tracking-wide text-accent-700">
              Preview
            </span>
          </div>
          <div
            className="mt-5 overflow-hidden rounded-2xl border"
            style={{
              backgroundColor: form.backgroundColor,
              color: form.textColor,
              borderColor: form.secondaryColor
            }}
          >
            <header
              className="flex min-h-20 items-center justify-between gap-4 px-5"
              style={{ backgroundColor: form.primaryColor }}
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="h-12 max-w-48 object-contain" />
              ) : (
                <strong className="text-white">{form.shortName || form.name || "Organization"}</strong>
              )}
              <span className="text-sm font-semibold text-white">Navigation</span>
            </header>
            <section
              className="bg-cover bg-center p-8"
              style={
                form.heroImageUrl
                  ? {
                      backgroundImage: `linear-gradient(#0008,#0008),url("${form.heroImageUrl}")`
                    }
                  : undefined
              }
            >
              <h3 className="text-3xl font-extrabold">
                {form.welcomeHeadline || `Welcome to ${form.name || "your organization"}`}
              </h3>
              <p className="mt-3 max-w-xl">
                {form.welcomeMessage || "Your organization welcome message appears here."}
              </p>
              <span
                className="mt-5 inline-block rounded-lg px-4 py-2 font-bold text-white"
                style={{ backgroundColor: form.buttonColor }}
              >
                Primary button
              </span>
              <p className="mt-4 text-sm font-bold" style={{ color: form.linkColor }}>
                Example member link
              </p>
            </section>
            <section className="m-5 rounded-xl bg-white p-5 text-brand-900">
              <div className="border-b pb-3">
                {form.emailLogoUrl ? (
                  <img src={form.emailLogoUrl} alt="" className="h-10 max-w-44 object-contain" />
                ) : (
                  <strong>{form.name || "Organization"} email header</strong>
                )}
              </div>
              <p className="py-5 text-sm">Announcement and transactional email content.</p>
              <p className="border-t pt-3 text-xs text-brand-500">
                {form.emailFooterText || form.footerText || "Email footer"}
              </p>
            </section>
          </div>
        </Card>

        <div className="sticky bottom-3 flex flex-wrap gap-3 rounded-xl border border-brand-200 bg-white/95 p-3 shadow-card backdrop-blur">
          <Button type="submit" disabled={busy || !dirty}>
            <Save className="h-4 w-4" />
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !dirty}
            onClick={() => {
              setForm(saved);
              setMessage("Unsaved changes were reset.");
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset unsaved changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void load()}
          >
            <X className="h-4 w-4" />
            Cancel changes
          </Button>
        </div>
      </form>
    </div>
  );
}
