import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberExperienceAccess, hasMemberExperienceAuthorization } from "@/lib/member-experience";

const updateSchema = z.object({
  tenantSlug: z.string().trim().min(1).max(63),
  id: z.string().uuid().optional(),
  all: z.boolean().optional()
}).refine((value) => Boolean(value.id) !== Boolean(value.all), "Choose one notification or all notifications.");

async function context(slug: string) {
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,slug").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!tenant) return null;
  const access = await getMemberExperienceAccess(tenant.id, tenant.slug);
  return hasMemberExperienceAuthorization(access) ? { admin, tenant, access: access! } : null;
}

export async function GET(request: NextRequest) {
  const resolved = await context(request.nextUrl.searchParams.get("tenantSlug") ?? "");
  if (!resolved) return NextResponse.json({ error: "Active member access is required." }, { status: 403 });
  const { data, error } = await resolved.admin.from("notifications").select("id,title,body,status,created_at")
    .eq("tenant_id", resolved.tenant.id).eq("user_id", resolved.access.user.id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid notification update." }, { status: 400 });
  const resolved = await context(parsed.data.tenantSlug);
  if (!resolved) return NextResponse.json({ error: "Active member access is required." }, { status: 403 });
  let query = resolved.admin.from("notifications").update({ status: "read", updated_at: new Date().toISOString() })
    .eq("tenant_id", resolved.tenant.id).eq("user_id", resolved.access.user.id).eq("status", "unread");
  if (parsed.data.id) query = query.eq("id", parsed.data.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  return NextResponse.json({ updated: true });
}
