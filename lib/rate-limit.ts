import "server-only";

import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationEnvironment } from "@/lib/env";

type LimitInput = { request?: NextRequest; headers?: Headers; scope: string; limit: number; windowSeconds: number; tenantId?: string; userId?: string; identifier?: string };
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number; unavailable?: boolean };

function secret() { const value = process.env.RATE_LIMIT_SECRET || process.env.APP_ENCRYPTION_KEY; if (value) return value; if (applicationEnvironment() === "production") throw new Error("RATE_LIMIT_SECRET is required in production."); return "upnexx-local-abuse-controls"; }
function clientAddress(headers: Headers) { return headers.get("cf-connecting-ip") || headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
function digest(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }

export async function enforceRateLimit(input: LimitInput): Promise<RateLimitResult> {
  const headers = input.request?.headers ?? input.headers ?? new Headers(); const correlationId = headers.get("x-correlation-id"); const identity = input.identifier || input.userId || clientAddress(headers); const keyHash = digest(`${input.scope}:${identity}`); const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_api_rate_limit", { target_scope: input.scope, target_key_hash: keyHash, target_limit: input.limit, target_window_seconds: input.windowSeconds, target_tenant: input.tenantId ?? null, target_user: input.userId ?? null });
  if (error) return { allowed: false, remaining: 0, retryAfterSeconds: 60, unavailable: true };
  const row = Array.isArray(data) ? data[0] : data; const result = { allowed: Boolean(row?.allowed), remaining: Number(row?.remaining ?? 0), retryAfterSeconds: Number(row?.retry_after_seconds ?? 60) };
  if (!result.allowed) {
    const fingerprint = `${input.scope}:${keyHash}`; const cutoff = new Date(Date.now() - 300000).toISOString(); const { data: existing } = await admin.from("security_events").select("id").eq("fingerprint", fingerprint).eq("status", "open").gte("created_at", cutoff).limit(1).maybeSingle();
    if (!existing) await admin.from("security_events").insert({ tenant_id: input.tenantId ?? null, user_id: input.userId ?? null, correlation_id: correlationId, event_type: "rate_limit_exceeded", severity: "warning", fingerprint, summary: `Rate limit exceeded for ${input.scope}.`, metadata: { scope: input.scope, limit: input.limit, windowSeconds: input.windowSeconds } });
  }
  return result;
}

export function rateLimitError(result: RateLimitResult) { return { error: result.unavailable ? "Abuse controls are temporarily unavailable." : "Too many requests. Try again later.", status: result.unavailable ? 503 : 429, headers: { "Retry-After": String(result.retryAfterSeconds), "X-RateLimit-Remaining": String(result.remaining) } }; }
