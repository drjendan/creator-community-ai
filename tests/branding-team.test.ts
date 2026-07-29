import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  createInvitationToken,
  hashInvitationToken,
  invitationCanBeAccepted,
  invitationExpiresAt,
  teamRoleKeys
} from "@/lib/team-invitations";
import { validateBrandImage } from "@/lib/image-validation";
import {
  isReservedPlatformLogo,
  withoutReservedTenantLogo
} from "@/lib/branding-settings";

describe("team invitation security", () => {
  const migration = readFileSync(
    "supabase/migrations/0011_branding_team_completion.sql",
    "utf8"
  );
  it("creates random tokens and stores deterministic hashes", () => {
    const first = createInvitationToken();
    const second = createInvitationToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashInvitationToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("supports every tenant team role exposed by the product", () => {
    expect(teamRoleKeys).toEqual([
      "tenant_admin",
      "communication_manager",
      "content_manager",
      "course_manager",
      "event_manager",
      "community_manager",
      "analyst",
      "support_staff"
    ]);
  });

  it("rejects expired, revoked, and wrong-email invitations", () => {
    expect(
      invitationCanBeAccepted({
        status: "sent",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        invitationEmail: "owner@example.com",
        userEmail: "owner@example.com"
      }).valid
    ).toBe(false);
    expect(
      invitationCanBeAccepted({
        status: "revoked",
        expiresAt: invitationExpiresAt(),
        invitationEmail: "owner@example.com",
        userEmail: "owner@example.com"
      }).valid
    ).toBe(false);
    expect(
      invitationCanBeAccepted({
        status: "sent",
        expiresAt: invitationExpiresAt(),
        invitationEmail: "owner@example.com",
        userEmail: "other@example.com"
      }).valid
    ).toBe(false);
  });

  it("enforces administrator-only cross-tenant mutations in SQL", () => {
    expect(migration).toContain("public.can_administer_tenant(tenant_id)");
    expect(migration).toContain(
      'drop policy if exists "tenant managers update" on public.tenant_memberships'
    );
    expect(migration).toContain(
      'drop policy if exists "tenant members read" on public.tenant_invitations'
    );
    expect(migration).toContain("for update");
    expect(migration).toContain("for delete");
  });

  it("accepts invitations atomically and grants the RPC only to service role", () => {
    expect(migration).toContain("for update;");
    expect(migration).toContain("on conflict (tenant_id,user_id) do update");
    expect(migration).toContain("status='accepted'");
    expect(migration).toContain(
      "grant execute on function public.accept_tenant_invitation(text,uuid,text) to service_role"
    );
  });
});

describe("brand image validation", () => {
  it("keeps platform-owned Nexx Jenn artwork out of tenant logo fields", () => {
    expect(isReservedPlatformLogo("/nexx-jenn-logo.png")).toBe(true);
    expect(
      isReservedPlatformLogo(
        "https://creator.example/nexx-jenn-mark.png"
      )
    ).toBe(true);
    expect(isReservedPlatformLogo("https://tenant.example/logo.png")).toBe(false);
    expect(
      withoutReservedTenantLogo({
        logo_url: "/nexx-jenn-logo.png",
        logo_storage_path: "legacy/platform-logo"
      })
    ).toEqual({ logo_url: null, logo_storage_path: null });
  });

  it("accepts a valid PNG with safe dimensions", async () => {
    const bytes = new Uint8Array(32);
    bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 512);
    view.setUint32(20, 256);
    const result = await validateBrandImage(
      new File([bytes], "logo.png", { type: "image/png" })
    );
    expect(result.valid).toBe(true);
    expect(result.dimensions).toEqual({ width: 512, height: 256 });
  });

  it("rejects executable content disguised as an image", async () => {
    const result = await validateBrandImage(
      new File(["<script>alert(1)</script>"], "logo.png", {
        type: "image/png"
      })
    );
    expect(result.valid).toBe(false);
  });

  it("rejects oversized images", async () => {
    const result = await validateBrandImage(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png"
      })
    );
    expect(result.valid).toBe(false);
  });
});
