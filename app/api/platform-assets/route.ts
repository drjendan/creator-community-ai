import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/x-icon"
]);

export async function POST(request: NextRequest) {
  if (!(await getPlatformAdministrator("platform.settings.manage"))) {
    return NextResponse.json(
      { error: "Platform administrator access is required." },
      { status: 403 }
    );
  }
  const data = await request.formData();
  const file = data.get("file");
  const scope = String(data.get("scope") ?? "platform");
  const tenantId = String(data.get("tenantId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 }
    );
  }
  if (!imageTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, WebP, SVG, or ICO image no larger than 5 MB." },
      { status: 400 }
    );
  }
  if (
    scope !== "platform" &&
    !z.string().uuid().safeParse(tenantId).success
  ) {
    return NextResponse.json(
      { error: "A valid selected tenant is required." },
      { status: 400 }
    );
  }
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.replace(/[^a-z0-9]/gi, "")
    : "bin";
  const prefix = scope === "platform" ? "platform" : `tenants/${tenantId}`;
  const path = `${prefix}/branding/${randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("brand-assets")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    return NextResponse.json(
      { error: "Unable to upload the brand image." },
      { status: 500 }
    );
  }
  const { data: publicAsset } = admin.storage
    .from("brand-assets")
    .getPublicUrl(path);
  return NextResponse.json({ path, url: publicAsset.publicUrl });
}
