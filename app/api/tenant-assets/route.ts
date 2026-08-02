import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { extensionForImageType, validateBrandImage } from "@/lib/image-validation";
import { trialMutationError } from "@/lib/trials";
import { enforceRateLimit, rateLimitError } from "@/lib/rate-limit";

const allowedFolders = new Set(["podcast", "courses", "events", "resources", "community", "branding", "communications"]);
const allowedTypes = new Set([
  "audio/mpeg", "audio/mp4", "audio/wav", "video/mp4",
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", "application/zip", "application/x-zip-compressed"
]);

export async function POST(request: NextRequest) {
  const context = await getActiveTenantManager();
  if (!context) return NextResponse.json({ error: "No manageable tenant is assigned to this account." }, { status: 403 });
  const trialError = await trialMutationError(context.tenant.id, "upload");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const limit = await enforceRateLimit({ request, scope: "tenant.media.upload", limit: 60, windowSeconds: 3600, tenantId: context.tenant.id, userId: context.user.id }); if (!limit.allowed) { const failure = rateLimitError(limit); return NextResponse.json({ error: failure.error }, { status: failure.status, headers: failure.headers }); }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "resources");
  const requestedRole = String(formData.get("assetRole") ?? "content");
  const assetRole = ["content", "secondary", "cover", "attachment"].includes(requestedRole) ? requestedRole : "content";
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!allowedFolders.has(folder)) return NextResponse.json({ error: "Invalid upload folder." }, { status: 400 });
  const authorized = folder === "branding"
    ? ["tenant_owner", "tenant_admin"].includes(context.role)
    : ["tenant_owner", "tenant_admin", "content_manager"].includes(context.role)
      || (folder === "courses" && context.role === "course_manager")
      || (folder === "events" && context.role === "event_manager")
      || (folder === "community" && ["community_manager", "community_moderator"].includes(context.role))
      || (folder === "communications" && context.role === "communication_manager");
  if (!authorized) return NextResponse.json({ error: "Your tenant role cannot upload to this area." }, { status: 403 });
  const feature = folder === "podcast" ? "podcasts" : folder === "branding" ? null : folder === "communications" ? "communication_hub" : folder;
  if (feature) {
    const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
    if (entitlements.get(feature) !== true) return NextResponse.json({ error: "This upload area is not enabled." }, { status: 403 });
  }
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "This file type is not supported." }, { status: 400 });
  let brandDimensions: { width: number; height: number } | null | undefined;
  if (folder === "branding") {
    const validation = await validateBrandImage(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    brandDimensions = validation.dimensions;
  }
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "Files must be 100 MB or smaller." }, { status: 400 });

  const extension = file.name.includes(".") ? file.name.split(".").pop()!.replace(/[^a-z0-9]/gi, "") : "bin";
  const path = `${context.tenant.id}/${folder}/${randomUUID()}.${extension}`;
  if (folder === "branding") {
    const admin = createAdminClient();
    const brandPath = `tenants/${context.tenant.id}/branding/${randomUUID()}.${extensionForImageType(file.type)}`;
    const { error } = await admin.storage.from("brand-assets").upload(brandPath, file, {
      contentType: file.type,
      upsert: false
    });
    if (error) return NextResponse.json({ error: "Unable to upload the brand image." }, { status: 500 });
    const { data: publicAsset } = admin.storage.from("brand-assets").getPublicUrl(brandPath);
    return NextResponse.json({ path: brandPath, url: publicAsset.publicUrl, name: file.name, dimensions: brandDimensions });
  }
  const { error } = await context.supabase.storage.from("tenant-assets").upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient(); const { data: asset, error: registryError } = await admin.from("protected_media_assets").insert({ tenant_id: context.tenant.id, bucket_id: "tenant-assets", object_path: path, original_name: file.name.slice(0, 255), mime_type: file.type, size_bytes: file.size, folder, asset_role: assetRole, access_level: "member", status: "pending", created_by: context.user.id }).select("id").single();
  if (registryError || !asset) { await context.supabase.storage.from("tenant-assets").remove([path]); return NextResponse.json({ error: /protected_media_assets|schema cache/i.test(registryError?.message ?? "") ? "Protected media migration 0034 is required." : "Unable to register the protected upload." }, { status: 500 }); }
  return NextResponse.json({ path, assetId: asset.id, url: `/api/media/${asset.id}`, name: file.name });
}
