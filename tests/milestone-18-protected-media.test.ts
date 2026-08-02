import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0034_protected_member_media.sql");
const upload = read("app/api/tenant-assets/route.ts");
const delivery = read("app/api/media/[id]/route.ts");
const content = read("app/api/tenant-content/[type]/route.ts");

describe("Milestone 18 protected member media", () => {
  it("registers managed assets and removes broad direct member storage reads", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 34)");
    expect(migration).toContain("create table if not exists public.protected_media_assets");
    expect(migration).toContain('drop policy if exists "tenant scoped storage read"');
    expect(migration).toContain('create policy "protected media managers read"');
    expect(migration).toContain("validate_protected_media_asset");
  });

  it("backfills legacy seven-day signatures to stable opaque media routes", () => {
    expect(migration).toContain("Backfill tenant-assets URLs issued by the legacy seven-day signing flow");
    expect(migration).toContain("select distinct on (tenant_id,object_path)");
    expect(migration).toContain("set audio_url='/api/media/'||asset.id");
    expect(migration).toContain("set url='/api/media/'||asset.id");
  });

  it("uploads pending registry records instead of persisting expiring signatures", () => {
    expect(upload).toContain('from("protected_media_assets").insert');
    expect(upload).toContain('status: "pending"');
    expect(upload).toContain('url: `/api/media/${asset.id}`');
    expect(upload).not.toContain("60 * 60 * 24 * 7");
  });

  it("binds assets to content and reauthorizes every short-lived signature", () => {
    expect(content).toContain("bindProtectedAssets");
    expect(content).toContain('status: "retired"');
    expect(delivery).toContain("createClient");
    expect(delivery).toContain('supabase.from(asset.content_type!)');
    expect(delivery).toContain("createSignedUrl(asset.object_path, 300");
    expect(delivery).toContain('scope: "media.sign"');
  });
});
