import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { platformNavItems } from "@/lib/navigation";

describe("Milestone 4 platform communications and support contracts", () => {
  it("gates both platform operations destinations with specific permissions", () => {
    expect(platformNavItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Platform Communications", href: "/platform-admin/communications", permission: "platform.communication.view" }),
      expect.objectContaining({ label: "Platform Support", href: "/platform-admin/support", permission: "platform.support.view" })
    ]));
    expect(readFileSync("app/platform-admin/communications/page.tsx", "utf8")).toContain('getPlatformAdministrator("platform.communication.view")');
    expect(readFileSync("app/platform-admin/support/page.tsx", "utf8")).toContain('permissions.has("platform.support.view")');
  });

  it("does not select encrypted provider credentials or tenant message bodies", () => {
    const page = readFileSync("app/platform-admin/communications/page.tsx", "utf8");
    expect(page).not.toContain("encrypted_api_key");
    expect(page).not.toContain("html_content");
    expect(page).not.toContain("plain_text_content");
    expect(page).toContain("Tenant credentials and message content are never displayed");
  });

  it("requires support management permission and audits each status change", () => {
    const route = readFileSync("app/api/platform/support/route.ts", "utf8");
    expect(route).toContain('getPlatformAdministrator("platform.support.manage")');
    expect(route).toContain('z.enum(["open", "in_progress", "resolved", "closed"])');
    expect(route).toContain('action: "platform.support_request.status_changed"');
    expect(route).toContain("tenant_id: current.tenant_id");
  });
});
