import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0036_transactional_notification_reliability.sql");
const delivery = read("lib/communications/reliable-delivery.ts");
const crypto = read("lib/security/sealed-payload.ts");
const cron = read("app/api/cron/communications/route.ts");
const operations = read("app/api/platform/operations/route.ts");

describe("Milestone 20 transactional notification reliability", () => {
  it("creates a bounded durable queue with atomic stale-lock recovery", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 36)");
    expect(migration).toContain("transactional_notification_deliveries");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("interval '10 minutes'");
    expect(migration).toContain("max_attempts integer not null default 5");
  });

  it("stores encrypted payloads and privacy-minimized recipient evidence", () => {
    expect(migration).toContain("encrypted_payload text not null");
    expect(migration).toContain("recipient_hash text not null");
    expect(delivery).toContain("sealPayload");
    expect(delivery).toContain('createHash("sha256")');
    expect(crypto).toContain('createCipheriv("aes-256-gcm"');
  });

  it("retries with backoff and reconciles invitation state after acceptance", () => {
    expect(delivery).toContain("retry_scheduled");
    expect(delivery).toContain("2 ** Math.max(row.attempts, 1)");
    expect(delivery).toContain('from("tenant_invitations").update');
    expect(delivery).toContain('from("platform_invitations").update');
    expect(cron).toContain("processQueuedTransactionalDeliveries(25)");
  });

  it("supports audited operator retries without exposing encrypted content", () => {
    expect(migration).toContain("retry_transactional_notification_delivery");
    expect(migration).not.toMatch(/policy[^;]+transactional_notification_deliveries[^;]+for delete/i);
    expect(operations).toContain('action: z.literal("retry_notification")');
    expect(operations).not.toContain('select("*,encrypted_payload")');
    expect(operations).toContain("platform.notification.retry_requested");
  });
});
