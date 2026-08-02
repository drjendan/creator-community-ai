import { NextResponse } from "next/server";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { listStudioSources } from "@/lib/ai/studio-sources";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const context = await getActiveTenantWithPermission("tenant.ai.use");
  if (!context) return NextResponse.json({ error: "AI Studio permission is required." }, { status: 403 });
  const { data: entitlement } = await createAdminClient().from("tenant_feature_entitlements").select("enabled").eq("tenant_id", context.tenant.id).eq("feature_key", "creator_ai_studio").maybeSingle();
  if (entitlement && !entitlement.enabled) return NextResponse.json({ error: "Creator AI Studio is not enabled for this tenant." }, { status: 403 });
  try {
    return NextResponse.json({ sources: await listStudioSources(context.tenant.id) });
  } catch {
    return NextResponse.json({ error: "Unable to load tenant AI sources." }, { status: 500 });
  }
}
