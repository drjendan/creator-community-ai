import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/feedback/EmptyState";

describe("application integration surfaces", () => {
  it("renders the sales landing page and all plan names", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: /Transform your expertise/i })).toBeInTheDocument();
    expect(screen.getAllByText(/\$49\.99/).length).toBeGreaterThan(0);
    expect(screen.getByText("$199.99")).toBeInTheDocument();
    expect(screen.queryByText("2,543")).not.toBeInTheDocument();
    expect(screen.queryByText("$24,850")).not.toBeInTheDocument();
    expect(screen.getAllByText("No recent activity.").length).toBeGreaterThan(0);
  });
  it("shares tenant branding and dashboard navigation", () => {
    render(<DashboardShell tenantName="Current Organization"><EmptyState title="No recent activity." description="Activity will appear here." /></DashboardShell>);
    expect(screen.getAllByText("Current Organization").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Audience" }));
    expect(screen.getByRole("navigation", { name: /Current Organization dashboard navigation/i })).toHaveTextContent("Memberships");
    fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getAllByText("No recent activity.").length).toBeGreaterThan(0);
  });
  it("provides a restartable guided dashboard tour", () => {
    window.localStorage.setItem("podcastos:onboarding:tenant:local:v2", "completed");
    const view = render(<DashboardShell tenantName="Current Organization"><EmptyState title="No recent activity." description="Activity will appear here." /></DashboardShell>);
    const scoped = within(view.container);
    fireEvent.click(scoped.getByRole("button", { name: "Take a tour" }));
    expect(scoped.getByRole("dialog")).toHaveTextContent("Welcome to UpNexx");
    fireEvent.click(scoped.getByRole("button", { name: "Next" }));
    expect(scoped.getByRole("dialog")).toHaveTextContent("Your podcast workspace");
    fireEvent.click(scoped.getByRole("button", { name: "Back" }));
    expect(scoped.getByRole("dialog")).toHaveTextContent("Welcome to UpNexx");
    fireEvent.click(scoped.getByRole("button", { name: "Skip tour" }));
    expect(scoped.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("podcastos:onboarding:tenant:local:v2")).toBe("dismissed");
  });
});

