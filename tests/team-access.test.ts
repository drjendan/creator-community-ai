import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  platformRoleHasPermission,
  tenantRoleHasPermission
} from "@/lib/permissions";

const migration = readFileSync(
  "supabase/migrations/0018_platform_tenant_team_access.sql",
  "utf8"
);
const tenantRlsMigration = readFileSync(
  "supabase/migrations/0011_branding_team_completion.sql",
  "utf8"
);
const ownerInvitationMigration = readFileSync(
  "supabase/migrations/0019_tenant_owner_team_invitations.sql",
  "utf8"
);
const platformRoute = readFileSync("app/api/platform/team/route.ts", "utf8");
const platformAcceptance = readFileSync(
  "app/api/platform/invitations/accept/route.ts",
  "utf8"
);
const platformContext = readFileSync("lib/platform-context.ts", "utf8");
const tenantRoute = readFileSync("app/api/team/route.ts", "utf8");
const platformTenantTeamRoute = readFileSync(
  "app/api/platform/tenants/[id]/team/route.ts",
  "utf8"
);

describe("platform and tenant Team & Access", () => {
  it("allows a Platform Owner to invite and grant Platform Owner access", () => {
    expect(platformRoleHasPermission("platform_owner", "platform.team.invite")).toBe(true);
    expect(platformRoleHasPermission("platform_owner", "platform.team.grant_owner")).toBe(true);
  });

  it("allows a Platform Administrator to invite allowed roles without granting ownership", () => {
    expect(platformRoleHasPermission("platform_admin", "platform.team.invite")).toBe(true);
    expect(platformRoleHasPermission("platform_admin", "platform.team.grant_owner")).toBe(false);
    expect(platformRoute).toContain("canGrantRole");
  });

  it("denies platform invitations without the server-side permission", () => {
    expect(platformRoute).toContain(
      'getPlatformAdministrator("platform.team.invite")'
    );
    expect(platformRoleHasPermission("platform_support", "platform.team.invite")).toBe(false);
  });

  it("keeps tenant roles separate from platform permissions", () => {
    expect(tenantRoleHasPermission("tenant_admin", "tenant.team.invite")).toBe(true);
    expect(tenantRoleHasPermission("viewer", "tenant.team.invite")).toBe(false);
    expect(tenantRoute).not.toContain("platform.team.grant_owner");
  });

  it("scopes Tenant Owner invitations and mutations to the active tenant", () => {
    expect(tenantRoute).toContain(".eq(\"tenant_id\", context.tenant.id)");
    expect(tenantRlsMigration).toContain("public.can_administer_tenant");
    expect(migration).toContain("protect_final_tenant_owner");
  });

  it("creates the correct membership through a locked single-use acceptance RPC", () => {
    expect(migration).toContain("accept_platform_invitation");
    expect(migration).toContain("where token_hash=supplied_token_hash for update");
    expect(migration).toContain("role_key=excluded.role_key,status='active'");
    expect(migration).toContain("grant execute on function public.accept_platform_invitation");
    expect(platformAcceptance).toContain('action: "platform.invitation.accepted"');
  });

  it("rejects expired, revoked, accepted, and reused platform invitation tokens", () => {
    expect(migration).toContain("if invitation.status<>'pending'");
    expect(migration).toContain("if invitation.expires_at<=now()");
    expect(migration).toContain("status='accepted'");
    expect(migration).toContain("status in ('pending','accepted','expired','revoked','failed')");
  });

  it("rotates invitation tokens on secure resend and never returns raw links", () => {
    expect(platformRoute).toContain("tokenPair()");
    expect(platformRoute).toContain("token_hash: tokenHash");
    expect(platformRoute).toContain("platform.invitation.resent");
    expect(platformRoute).not.toContain("invitationLink");
    expect(tenantRoute).not.toContain("copy_link");
    expect(tenantRoute).not.toContain("invitationLink");
  });

  it("applies role and suspension changes immediately through database membership checks", () => {
    expect(platformContext).toContain('.from("platform_memberships")');
    expect(platformContext).toContain('membership.status !== "active"');
    expect(platformRoute).toContain("platform.team_member.");
  });

  it("prevents final-owner loss and self-elevation", () => {
    expect(migration).toContain("final_platform_owner_required");
    expect(migration).toContain("protect_final_platform_owner");
    expect(platformRoute).toContain("You cannot change your own platform role.");
    expect(platformRoute).toContain("You cannot invite or elevate your own account.");
  });

  it("rate-limits invitation attempts and records access audit events", () => {
    expect(platformRoute).toContain("platform.invitation.attempted");
    expect(platformRoute).toContain("Invitation limit reached");
    expect(platformRoute).toContain('.from("platform_access_history").insert');
    expect(platformRoute).toContain('.from("audit_logs").insert');
    expect(tenantRoute).toContain("tenant.invitation.attempted");
  });

  it("allows platform tenant managers to invite owners and every supported tenant role", () => {
    expect(ownerInvitationMigration).toContain("'tenant_owner','tenant_admin','billing_admin'");
    expect(platformTenantTeamRoute).toContain(
      'getPlatformAdministrator("platform.tenants.manage")'
    );
    expect(platformTenantTeamRoute).toContain(
      'const managedRoleKeys = ["tenant_owner", ...tenantTeamRoleKeys]'
    );
    expect(platformTenantTeamRoute).toContain(".eq(\"tenant_id\", id)");
  });

  it("protects owner grants and secure tenant invitation delivery", () => {
    expect(platformTenantTeamRoute).toContain(
      "Sign in again before granting Tenant Owner access."
    );
    expect(platformTenantTeamRoute).toContain("deliverTeamInvitation");
    expect(platformTenantTeamRoute).toContain("token_hash: tokenHash");
    expect(platformTenantTeamRoute).not.toContain("invitationLink");
    expect(migration).toContain("final_tenant_owner_required");
  });
});
