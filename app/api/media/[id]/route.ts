import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit, rateLimitError } from "@/lib/rate-limit";

const tables = new Set(["episodes", "courses", "events", "resources"]);
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const limit = await enforceRateLimit({ request, scope: "media.sign", limit: 600, windowSeconds: 3600 }); if (!limit.allowed) { const failure = rateLimitError(limit); return NextResponse.json({ error: failure.error }, { status: failure.status, headers: failure.headers }); }
  const admin = createAdminClient(); const { data: asset, error } = await admin.from("protected_media_assets").select("id,tenant_id,bucket_id,object_path,original_name,content_type,content_id,status").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: /protected_media_assets|schema cache/i.test(error.message) ? "Protected media migration 0034 is required." : "Unable to authorize media." }, { status: 503 });
  if (!asset || asset.status !== "active" || !asset.content_id || !tables.has(asset.content_type ?? "")) return NextResponse.json({ error: "Media not found." }, { status: 404 });
  const supabase = await createClient(); const { data: content } = await supabase.from(asset.content_type!).select("id").eq("id", asset.content_id).eq("tenant_id", asset.tenant_id).maybeSingle(); if (!content) return NextResponse.json({ error: "Media access is unavailable." }, { status: 403 });
  const download = request.nextUrl.searchParams.get("download") === "1"; const { data: signed, error: signError } = await admin.storage.from(asset.bucket_id).createSignedUrl(asset.object_path, 300, download ? { download: asset.original_name || true } : undefined); if (signError || !signed) return NextResponse.json({ error: "Unable to open media." }, { status: 503 });
  const response = NextResponse.redirect(signed.signedUrl, 307); response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer"); return response;
}
