import { NextRequest, NextResponse } from "next/server";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  tenantBrandingRow,
  tenantBrandingSchema
} from "@/lib/branding-settings";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getPlatformAdministrator())) {
    return NextResponse.json(
      { error: "Platform administrator access is required." },
      { status: 403 }
    );
  }
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: tenant }, { data: branding }] = await Promise.all([
    admin.from("tenants").select("id,name,slug").eq("id", id).maybeSingle(),
    admin.from("tenant_branding").select("*").eq("tenant_id", id).maybeSingle()
  ]);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  return NextResponse.json({ tenant, branding });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getPlatformAdministrator())) {
    return NextResponse.json(
      { error: "Platform administrator access is required." },
      { status: 403 }
    );
  }
  const parsed = tenantBrandingSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid tenant branding." },
      { status: 400 }
    );
  }
  const { id } = await params;
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }
  const [{ error: tenantError }, { error: brandingError }] = await Promise.all([
    admin
      .from("tenants")
      .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
      .eq("id", id),
    admin
      .from("tenant_branding")
      .upsert(tenantBrandingRow(id, parsed.data), { onConflict: "tenant_id" })
  ]);
  if (tenantError || brandingError) {
    return NextResponse.json(
      { error: "Unable to save tenant branding." },
      { status: 500 }
    );
  }
  return NextResponse.json({ saved: true });
}
