import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeAccountValues, type StripeAccountSnapshot } from "@/lib/stripe-connect";

function validSignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=")));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const supplied = Buffer.from(parts.v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return supplied.length === expectedBuffer.length && timingSafeEqual(supplied, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!validSignature(payload, signature, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  const event = JSON.parse(payload) as { id: string; type: string; data: { object: StripeAccountSnapshot } };
  if (event.type === "account.updated") {
    const admin = createAdminClient();
    const values = stripeAccountValues(event.data.object);
    await admin.from("tenant_stripe_accounts").update(values).eq("stripe_account_id", event.data.object.id);
  }
  return NextResponse.json({ received: true });
}
