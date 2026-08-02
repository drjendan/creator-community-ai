import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantMemberContext } from "@/lib/communications/member-context";

const schema = z.object({ tenantSlug: z.string().trim().min(1).max(120), resourceId: z.string().uuid(), saved: z.boolean() });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check the saved-resource request." }, { status: 400 });
  const input = parsed.data; const context = await getTenantMemberContext(input.tenantSlug); if (!context) return NextResponse.json({ error: "Active organization membership is required." }, { status: 401 });
  const { data: resource } = await context.supabase.from("resources").select("id").eq("id", input.resourceId).eq("tenant_id", context.tenant.id).eq("status", "published").maybeSingle(); if (!resource) return NextResponse.json({ error: "This resource is not available." }, { status: 404 });
  const result = input.saved
    ? await context.supabase.from("resource_bookmarks").upsert({ tenant_id: context.tenant.id, resource_id: input.resourceId, user_id: context.user.id }, { onConflict: "resource_id,user_id" })
    : await context.supabase.from("resource_bookmarks").delete().eq("tenant_id", context.tenant.id).eq("resource_id", input.resourceId).eq("user_id", context.user.id);
  if (result.error) return NextResponse.json({ error: /resource_bookmarks|schema cache/i.test(result.error.message) ? "Resource migration 0029 is required." : "Unable to update saved resources." }, { status: 500 });
  return NextResponse.json({ saved: input.saved });
}
