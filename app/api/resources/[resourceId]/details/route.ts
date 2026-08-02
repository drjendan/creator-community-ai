import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { trialMutationError } from "@/lib/trials";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("metadata"), fullDescription: z.string().trim().max(30000), author: z.string().trim().max(180), fileFormat: z.string().trim().max(40), fileSizeBytes: z.number().int().min(0).max(10_000_000_000).nullable(), versionLabel: z.string().trim().min(1).max(40), allowDownload: z.boolean(), featured: z.boolean(), publishDate: z.string().datetime().nullable() }),
  z.object({ kind: z.literal("version"), versionLabel: z.string().trim().min(1).max(40), notes: z.string().trim().max(3000), url: z.string().trim().url().max(2000), fileFormat: z.string().trim().max(40), fileSizeBytes: z.number().int().min(0).max(10_000_000_000).nullable(), allowDownload: z.boolean(), status: z.enum(["draft","published","archived"]) })
]);

async function authorize(resourceId: string) {
  const context = await getActiveTenantWithPermission("tenant.resources.manage"); if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase); if (entitlements.get("resources") !== true) return null;
  const admin = createAdminClient(); const { data: resource } = await admin.from("resources").select("*").eq("id", resourceId).eq("tenant_id", context.tenant.id).maybeSingle();
  return resource ? { context, admin, resource } : null;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params; if (!z.string().uuid().safeParse(resourceId).success) return NextResponse.json({ error: "A valid resource is required." }, { status: 400 });
  const authorized = await authorize(resourceId); if (!authorized) return NextResponse.json({ error: "Resource management permission is required." }, { status: 403 });
  const { data: versions, error } = await authorized.admin.from("resource_versions").select("*").eq("tenant_id", authorized.context.tenant.id).eq("resource_id", resourceId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: /resource_versions|schema cache/i.test(error.message) ? "Resource migration 0029 is required." : "Unable to load resource details." }, { status: 500 });
  return NextResponse.json({ resource: authorized.resource, versions: versions ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check the resource detail fields." }, { status: 400 });
  const authorized = await authorize(resourceId); if (!authorized) return NextResponse.json({ error: "Resource management permission is required." }, { status: 403 });
  const { context, admin } = authorized; const trialError = await trialMutationError(context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const input = parsed.data; const now = new Date().toISOString(); let error: { message: string } | null = null;
  if (input.kind === "metadata") {
    ({ error } = await admin.from("resources").update({ full_description: input.fullDescription, author: input.author, file_format: input.fileFormat, file_size_bytes: input.fileSizeBytes, version_label: input.versionLabel, allow_download: input.allowDownload, featured: input.featured, publish_date: input.publishDate, updated_at: now }).eq("id", resourceId).eq("tenant_id", context.tenant.id));
  } else {
    ({ error } = await admin.from("resource_versions").insert({ tenant_id: context.tenant.id, resource_id: resourceId, version_label: input.versionLabel, notes: input.notes, url: input.url, file_format: input.fileFormat, file_size_bytes: input.fileSizeBytes, allow_download: input.allowDownload, status: input.status, created_by: context.user.id, updated_at: now }));
  }
  if (error) return NextResponse.json({ error: /full_description|resource_versions|schema cache/i.test(error.message) ? "Resource migration 0029 is required." : /duplicate key/i.test(error.message) ? "That version label already exists." : "Unable to save resource details." }, { status: 500 });
  await admin.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: `tenant.resource.${input.kind}_saved`, entity_type: "resource", entity_id: resourceId });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params; const versionId = request.nextUrl.searchParams.get("versionId"); if (!versionId || !z.string().uuid().safeParse(versionId).success) return NextResponse.json({ error: "A valid version is required." }, { status: 400 });
  const authorized = await authorize(resourceId); if (!authorized) return NextResponse.json({ error: "Resource management permission is required." }, { status: 403 });
  const trialError = await trialMutationError(authorized.context.tenant.id, "content"); if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const { error } = await authorized.admin.from("resource_versions").delete().eq("id", versionId).eq("tenant_id", authorized.context.tenant.id).eq("resource_id", resourceId);
  if (error) return NextResponse.json({ error: "Unable to remove the resource version." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
