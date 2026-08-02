import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenantCreationWizard } from "@/components/platform/TenantCreationWizard";

vi.mock("@/app/platform-admin/tenants/actions", () => ({
  createTenant: vi.fn()
}));

describe("zero-demo-data tenant wizard", () => {
  it("provisions an empty customer workspace without a membership template step", async () => {
    const user = userEvent.setup();
    render(<TenantCreationWizard authorized />);

    await user.type(screen.getByPlaceholderText("The Creator Podcast"), "Community Foundation");
    await user.type(screen.getByPlaceholderText("the-creator-podcast"), "community-foundation");

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    expect(screen.getByRole("heading", { name: "Tenant administrator invitation" })).toBeInTheDocument();
    expect(screen.queryByText("Audience Memberships")).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("creator@example.com"), "owner@example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Starts empty")).toBeInTheDocument();
    expect(screen.getByText(/Members and business content start empty/)).toBeInTheDocument();
  });
});
