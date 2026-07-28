import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenantCreationWizard } from "@/components/platform/TenantCreationWizard";

vi.mock("@/app/platform-admin/tenants/actions", () => ({
  createTenant: vi.fn()
}));

describe("audience membership template wizard", () => {
  it("recommends the nonprofit and faith-based starter plans and preserves an override", async () => {
    const user = userEvent.setup();
    render(<TenantCreationWizard authorized />);

    await user.type(screen.getByPlaceholderText("The Creator Podcast"), "Community Foundation");
    await user.type(screen.getByPlaceholderText("the-creator-podcast"), "community-foundation");
    await user.selectOptions(screen.getByRole("combobox", { name: "Business type" }), "nonprofit");

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    expect(screen.getByRole("heading", { name: "Choose an Audience Membership Template" })).toBeInTheDocument();
    const recommended = screen.getByRole("radio", { name: "Nonprofit & Faith-Based Organization, recommended for Nonprofit" });
    expect(recommended).toBeChecked();
    expect(screen.getByText("Community Member • Supporter • Leadership")).toBeInTheDocument();
    expect(screen.getByText("Recommended")).toBeInTheDocument();

    const override = screen.getByRole("radio", { name: "Free and Premium" });
    await user.click(override);
    expect(override).toBeChecked();
    expect(recommended).not.toBeChecked();
    expect(screen.getByText("You can customize these plans later.")).toBeInTheDocument();
  });
});
