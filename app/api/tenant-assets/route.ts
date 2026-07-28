import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getActiveTenantManager } from "@/lib/tenant-context";

const allowedFolders = new Set(["podcast", "courses", "events", "resources", "community"]);
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

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "resources");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!allowedFolders.has(folder)) return NextResponse.json({ error: "Invalid upload folder." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "This file type is not supported." }, { status: 400 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "Files must be 100 MB or smaller." }, { status: 400 });

  const extension = file.name.includes(".") ? file.name.split(".").pop()!.replace(/[^a-z0-9]/gi, "") : "bin";
  const path = `${context.tenant.id}/${folder}/${randomUUID()}.${extension}`;
  const { error } = await context.supabase.storage.from("tenant-assets").upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: signed, error: signedError } = await context.supabase.storage
    .from("tenant-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signedError) return NextResponse.json({ error: signedError.message }, { status: 500 });
  return NextResponse.json({ path, url: signed.signedUrl, name: file.name });
}
