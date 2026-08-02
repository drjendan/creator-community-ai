import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStripeSignature(payload: string, header: string, secret: string, toleranceSeconds = 300) {
  const values = header.split(",").reduce<Record<string, string[]>>((result, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return result;
    const key = part.slice(0, separator);
    (result[key] ??= []).push(part.slice(separator + 1));
    return result;
  }, {});
  const timestamp = Number(values.t?.[0]);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex"), "hex");
  return (values.v1 ?? []).some((signature) => {
    try {
      const supplied = Buffer.from(signature, "hex");
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    } catch { return false; }
  });
}

export type StripeEvent = {
  id: string;
  type: string;
  account?: string;
  livemode?: boolean;
  data: { object: Record<string, unknown> & { id: string; metadata?: Record<string, string> } };
};
