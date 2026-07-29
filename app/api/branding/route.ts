import { NextRequest, NextResponse } from "next/server";
import { tenantBrandingRow, tenantBrandingSchema } from "@/lib/branding-settings";
import { getActiveTenantAdministrator } from "@/lib/tenant-context";

export async function GET() {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const { data, error } = await context.supabase
    .from("tenant_branding")
    .select("*")
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "Unable to load organization branding." },
      { status: 500 }
    );
  }
  return NextResponse.json({ tenant: context.tenant, branding: data });
}

export async function POST(request: NextRequest) {
  const context = await getActiveTenantAdministrator();
  if (!context) {
    return NextResponse.json(
      { error: "Organization administrator access is required." },
      { status: 403 }
    );
  }
  const parsed = tenantBrandingSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid branding settings." },
      { status: 400 }
    );
  }
  const now = new Date().toISOString();
  const [{ error: tenantError }, { error: brandingError }] = await Promise.all([
    context.supabase
      .from("tenants")
      .update({ name: parsed.data.name, updated_at: now })
      .eq("id", context.tenant.id),
    context.supabase
      .from("tenant_branding")
      .upsert(
        tenantBrandingRow(context.tenant.id, parsed.data, context.user.id),
        { onConflict: "tenant_id" }
      )
  ]);
  if (tenantError || brandingError) {
    return NextResponse.json(
      { error: "Unable to save organization branding." },
      { status: 500 }
    );
  }
  await context.supabase.from("audit_logs").insert({
    tenant_id: context.tenant.id,
    user_id: context.user.id,
    action: "tenant.branding.updated",
    entity_type: "tenant_branding",
    metadata: {
      logo: Boolean(parsed.data.logoUrl),
      primary_color: parsed.data.primaryColor
    }
  });
  return NextResponse.json({ saved: true });
}
