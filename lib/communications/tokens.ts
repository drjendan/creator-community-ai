import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type PreferenceToken = { tenantId: string; userId: string; email: string; expiresAt: number };

function secret() {
  const value = process.env.COMMUNICATION_SIGNING_SECRET;
  if (!value || value.length < 32) throw new Error("COMMUNICATION_SIGNING_SECRET must contain at least 32 characters.");
  return value;
}

export function createPreferenceToken(input: Omit<PreferenceToken, "expiresAt">, lifetimeDays = 365) {
  const payload = Buffer.from(JSON.stringify({ ...input, expiresAt: Date.now() + lifetimeDays * 86400000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPreferenceToken(token: string): PreferenceToken | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PreferenceToken;
    if (!parsed.tenantId || !parsed.userId || !parsed.email || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
