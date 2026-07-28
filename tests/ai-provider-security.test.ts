import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getProviderAdapter } from "@/lib/ai/provider-adapters";
import {
  decryptApiKey,
  encryptApiKey,
  getKeyLastFour,
  hasValidEncryptionConfiguration
} from "@/lib/security/api-key-encryption";

const originalEncryptionKey = process.env.APP_ENCRYPTION_KEY;

describe("AI credential encryption", () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterEach(() => {
    if (originalEncryptionKey === undefined) delete process.env.APP_ENCRYPTION_KEY;
    else process.env.APP_ENCRYPTION_KEY = originalEncryptionKey;
  });

  it("round-trips with unique nonces and never embeds plaintext", () => {
    const key = "sk-test-secret-A7K9";
    const first = encryptApiKey(key);
    const second = encryptApiKey(key);
    expect(first).not.toBe(second);
    expect(first).not.toContain(key);
    expect(decryptApiKey(first)).toBe(key);
    expect(getKeyLastFour(key)).toBe("A7K9");
  });

  it("fails safely with a missing or incorrect encryption key", () => {
    const encrypted = encryptApiKey("tenant-provider-secret");
    process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    expect(() => decryptApiKey(encrypted)).toThrow();
    delete process.env.APP_ENCRYPTION_KEY;
    expect(hasValidEncryptionConfiguration()).toBe(false);
    expect(() => encryptApiKey("never-store-plaintext")).toThrow();
  });
});

describe("provider error normalization", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [401, "", "invalid_credential"],
    [404, "", "model_unavailable"],
    [429, "rate limit", "rate_limited"],
    [429, "insufficient quota", "insufficient_credits"],
    [503, "", "provider_unavailable"]
  ] as const)("normalizes HTTP %s without returning raw provider details", async (status, body, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status })));
    await expect(getProviderAdapter("openai").testConnection("candidate-secret", "gpt-4.1-mini"))
      .resolves.toEqual({ ok: false, code });
  });

  it("keeps Gemini credentials out of URLs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getProviderAdapter("google").testConnection("candidate-secret", "gemini-2.5-flash");
    expect(fetchMock.mock.calls[0][0]).not.toContain("candidate-secret");
    expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("candidate-secret");
  });
});
