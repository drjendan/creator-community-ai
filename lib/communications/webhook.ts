import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyResendWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signatures) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signatures.split(" ").some((entry) => {
    const [, value] = entry.split(",");
    if (!value) return false;
    const supplied = Buffer.from(value, "base64");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}
