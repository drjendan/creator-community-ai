import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEnvironmentReport } from "@/lib/env";
import { logError, logInfo, logWarning } from "@/lib/logging";

export const dynamic = "force-dynamic";

async function withTimeout<T>(promise: PromiseLike<T>, milliseconds: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database health check timed out.")), milliseconds);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-correlation-id") || crypto.randomUUID();
  const environment = getEnvironmentReport();
  if (!environment.valid) {
    logWarning("health.configuration_invalid", {
      requestId,
      missingCount: environment.missing.length
    });
    return NextResponse.json({
      status: "unhealthy",
      environment: environment.environment,
      checks: { configuration: "failed", database: "not_checked" },
      requestId
    }, { status: 503 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const check = supabase.from("tenants").select("id", { count: "exact", head: true }).limit(1);
    const result = await withTimeout(check, 5000);
    if (result.error) throw result.error;
    logInfo("health.ok", { requestId });
    return NextResponse.json({
      status: "healthy",
      environment: environment.environment,
      checks: { configuration: "passed", database: "passed" },
      requestId
    });
  } catch (error) {
    logError("health.database_failed", error, { requestId });
    return NextResponse.json({
      status: "unhealthy",
      environment: environment.environment,
      checks: { configuration: "passed", database: "failed" },
      requestId
    }, { status: 503 });
  }
}
