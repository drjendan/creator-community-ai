import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createPreferenceToken, verifyPreferenceToken } from "@/lib/communications/tokens";
import { ResendEmailProviderAdapter } from "@/lib/communications/provider";
import { verifyResendWebhook } from "@/lib/communications/webhook";
import { dashboardNavItems } from "@/lib/navigation";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.COMMUNICATION_SIGNING_SECRET;
  delete process.env.RESEND_WEBHOOK_SECRET;
});

describe("Communication Hub security", () => {
  it("signs, verifies, and rejects tampered preference tokens", () => {
    process.env.COMMUNICATION_SIGNING_SECRET = "test-signing-secret-that-is-at-least-32-characters";
    const token = createPreferenceToken({ tenantId: "tenant-a", userId: "user-a", email: "member@example.com" });
    expect(verifyPreferenceToken(token)).toMatchObject({ tenantId: "tenant-a", userId: "user-a", email: "member@example.com" });
    expect(verifyPreferenceToken(`${token}x`)).toBeNull();
  });

  it("validates Resend webhook signatures and rejects modified payloads", () => {
    const key = Buffer.from("webhook-test-secret-32-characters!!").toString("base64");
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${key}`;
    const payload = JSON.stringify({ type: "email.delivered", data: { email_id: "email-1" } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", Buffer.from(key, "base64")).update(`event-1.${timestamp}.${payload}`).digest("base64");
    const headers = new Headers({ "svix-id": "event-1", "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` });
    expect(verifyResendWebhook(payload, headers)).toBe(true);
    expect(verifyResendWebhook(`${payload} `, headers)).toBe(false);
  });

  it("never includes an API key in normalized provider errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const adapter = new ResendEmailProviderAdapter("re_secret-value-that-must-not-leak");
    const result = await adapter.testConnection();
    expect(result.connected).toBe(false);
    expect(result.error).not.toContain("re_secret");
  });

  it("declares every Communication Hub navigation item behind an entitlement", () => {
    const communicationItems = dashboardNavItems.filter((item) => item.href.startsWith("/dashboard/communications"));
    expect(communicationItems.length).toBeGreaterThan(5);
    expect(communicationItems.every((item) => Boolean(item.featureKey))).toBe(true);
  });

  it("creates tenant-scoped tables and enables RLS in migration 0009", () => {
    const migration = readFileSync("supabase/migrations/0009_communication_hub.sql", "utf8");
    expect(migration).toContain("tenant_communication_provider_configs");
    expect(migration).toContain("communication_delivery_events");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("public.can_manage_communications");
    expect(migration).toContain("revoke select on table public.tenant_communication_provider_configs");
    expect(migration).toContain("increment_communication_usage");
    expect(migration).not.toMatch(/insert\s+into\s+public\.email_campaigns/i);
  });

  it("keeps unfinished automation and AI Coach builders out of production navigation", () => {
    const labels = dashboardNavItems.map((item) => item.label);
    expect(labels).not.toContain("Automations");
    expect(labels).not.toContain("AI Coach");
  });
});
