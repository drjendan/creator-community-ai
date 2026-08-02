import { readFileSync } from "node:fs";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberHeader } from "@/components/tenant/MemberHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { memberNavigation } from "@/lib/member-navigation";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/app/platform-admin/tenants/actions", () => ({ enterTenantWorkspace: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const base = "/demo/ai-at-work";
const member = { userLabel: "Member User", canTenantAdmin: false, canPlatformAdmin: false, canManageTenantAsPlatform: false };
const tenantAdmin = { ...member, canTenantAdmin: true };
const platformAdmin = { ...tenantAdmin, canPlatformAdmin: true, canManageTenantAsPlatform: true };

function header(access = member) {
  return <MemberHeader tenantId="00000000-0000-0000-0000-000000000001" tenantName="AI at Work" base={base} navigation={memberNavigation(base)} access={access} initialNotifications={[]} />;
}

describe("shared Member Experience navigation", () => {
  it("shows only Welcome, Content Library, and Community at the top level", async () => {
    const user = userEvent.setup();
    render(header());
    const nav = screen.getByRole("navigation", { name: "AI at Work member navigation" });
    const topLinks = within(nav).getAllByRole("link").map((link) => link.textContent);
    expect(topLinks).toEqual(["Welcome", "Content Library"]);
    expect(within(nav).getByRole("button", { name: "Community" })).toBeInTheDocument();
    for (const removed of ["Membership", "Messages", "Preferences", "Data & privacy", "Member Home"]) expect(within(nav).queryByText(removed)).not.toBeInTheDocument();
    await user.click(within(nav).getByRole("button", { name: "Community" }));
    expect(screen.getByRole("menuitem", { name: "Discussions" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Messages" })).toBeInTheDocument();
  });

  it("moves account, membership details, preferences, and sign out into Profile", async () => {
    const user = userEvent.setup();
    render(header());
    await user.click(screen.getByRole("button", { name: "Open profile menu" }));
    expect(screen.getByRole("menuitem", { name: "My Account" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Billing or Membership Details" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("shows the notification bell and keeps menus keyboard dismissible", async () => {
    const user = userEvent.setup();
    render(header());
    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).toBeInTheDocument();
    const community = screen.getByRole("button", { name: "Community" });
    await user.click(community);
    await user.keyboard("{Escape}");
    expect(community).toHaveFocus();
    expect(screen.queryByRole("menuitem", { name: "Discussions" })).not.toBeInTheDocument();
  });

  it("shows unread notifications and can mark one or all as read", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<MemberHeader tenantId="00000000-0000-0000-0000-000000000001" tenantName="AI at Work" base={base} navigation={memberNavigation(base)} access={member} initialNotifications={[{
      id: "00000000-0000-0000-0000-000000000002",
      title: "A real update",
      body: "The organization posted an update.",
      status: "unread",
      created_at: "2026-08-02T12:00:00.000Z"
    }]} />);
    await user.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    expect(screen.getByText("A real update")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/member/notifications", expect.objectContaining({ method: "PATCH" }));
  });

  it("derives workspace options from effective permissions", async () => {
    const user = userEvent.setup();
    const { rerender } = render(header(member));
    expect(screen.queryByRole("button", { name: "Open workspace switcher" })).not.toBeInTheDocument();
    rerender(header(tenantAdmin));
    expect(screen.getByRole("link", { name: "Return to Tenant Admin" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open workspace switcher" }));
    expect(screen.getByRole("menuitem", { name: "Member Home" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Tenant Admin" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Platform Admin" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    rerender(header(platformAdmin));
    await user.click(screen.getByRole("button", { name: "Open workspace switcher" }));
    expect(screen.getByRole("menuitem", { name: "Member Home" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Tenant Admin" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Platform Admin" })).toBeInTheDocument();
  });

  it("uses the same hierarchy on mobile", async () => {
    const user = userEvent.setup();
    render(header());
    await user.click(screen.getByRole("button", { name: "Toggle member navigation" }));
    const mobile = screen.getByRole("navigation", { name: "Mobile member navigation" });
    expect(within(mobile).getByRole("link", { name: "Welcome" })).toBeInTheDocument();
    expect(within(mobile).getByRole("link", { name: "Content Library" })).toBeInTheDocument();
    await user.click(within(mobile).getByRole("button", { name: "Community" }));
    expect(within(mobile).getByRole("link", { name: "Discussions" })).toBeInTheDocument();
    expect(within(mobile).getByRole("link", { name: "Messages" })).toBeInTheDocument();
  });
});

describe("Member Experience contracts", () => {
  it("places legal and member data links in the shared footer", () => {
    render(<AppFooter tenantName="AI at Work" tenantSlug="ai-at-work" />);
    for (const label of ["Terms", "Privacy", "Refunds", "Cookies", "Acceptable Use", "Accessibility", "Data & Privacy"]) expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });

  it("uses tenant-neutral shared Content Library language", () => {
    const library = readFileSync("app/demo/[tenant-slug]/library/page.tsx", "utf8");
    expect(library).toContain('eyebrow="Content Library"');
    expect(library).toContain('title="Explore Your Content"');
    expect(library).toContain("courses, podcasts, videos, documents, templates, and other resources");
    expect(library).not.toContain("creator library");
    expect(library).not.toContain("Stream podcast episodes");
  });

  it("enforces admin authorization on the server and preserves tenant routing", () => {
    const dashboardLayout = readFileSync("app/dashboard/layout.tsx", "utf8");
    const middleware = readFileSync("middleware.ts", "utf8");
    expect(dashboardLayout).toContain('redirect(platformAccess ? "/platform-admin" : "/")');
    expect(middleware).toContain('"/account", "/notifications"');
  });
});
