import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import DemoTenantPage from "@/app/demo/[tenant-slug]/page";
import MembershipPage from "@/app/demo/[tenant-slug]/membership/page";
import DashboardOverviewPage from "@/app/dashboard/page";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

describe("application integration surfaces", () => {
  it("renders the sales landing page and all plan names", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: /Transform your expertise/i })).toBeInTheDocument();
    expect(screen.getAllByText(/\$49\.99/).length).toBeGreaterThan(0);
    expect(screen.getByText("$199.99")).toBeInTheDocument();
    expect(screen.getByText(/Example community powered by UpNexx/i)).toBeInTheDocument();
  });
  it("renders tenant-aware demo branding", () => {
    render(<DemoTenantPage />);
    expect(screen.getByText("AI at Work podcast & community")).toBeInTheDocument();
    expect(screen.getAllByText(/How Small Businesses Can Use AI/).length).toBeGreaterThan(0);
  });
  it("renders all tenant membership plans", () => {
    render(<MembershipPage />);
    expect(screen.getByText("Listener")).toBeInTheDocument();
    expect(screen.getByText("AI Insider")).toBeInTheDocument();
    expect(screen.getByText("AI Leadership Circle")).toBeInTheDocument();
  });
  it("shares tenant branding and dashboard navigation", () => {
    render(<DashboardShell><DashboardOverviewPage /></DashboardShell>);
    expect(screen.getAllByText("AI at Work").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Audience" }));
    expect(screen.getByRole("navigation", { name: /AI at Work dashboard navigation/i })).toHaveTextContent("Memberships");
    fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.getByText("Total members")).toBeInTheDocument();
  });
  it("provides a restartable guided dashboard tour", () => {
    window.localStorage.setItem("podcastos:onboarding:tenant:local:v2", "completed");
    const view = render(<DashboardShell><DashboardOverviewPage /></DashboardShell>);
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

