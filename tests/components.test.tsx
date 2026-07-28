import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PricingCard } from "@/components/marketing/PricingCard";
import { EpisodeCard, MembershipCard } from "@/components/content/ContentCards";
import { DemoRequestForm } from "@/components/forms/DemoRequestForm";
import { demoEpisodes, membershipPlans, plans } from "@/lib/mock/podcastos";

describe("navigation and reusable cards", () => {
  it("renders public navigation and opens its mobile menu", async () => {
    render(<PublicNav />);
    expect(screen.getByRole("link", { name: /UpNexx home/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /toggle mobile navigation/i }));
    expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();
  });
  it("renders pricing, episode, and membership data", () => {
    const { rerender } = render(<PricingCard plan={plans[1]} />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("$99.99")).toBeInTheDocument();
    rerender(<EpisodeCard episode={demoEpisodes[0]} />);
    expect(screen.getByText(demoEpisodes[0].title)).toBeInTheDocument();
    rerender(<MembershipCard plan={membershipPlans[1]} />);
    expect(screen.getByText("$9.99 per month")).toBeInTheDocument();
  });
});

describe("professional form", () => {
  it("validates before showing its mock integration message", async () => {
    render(<DemoRequestForm />);
    await userEvent.click(screen.getByRole("button", { name: "Request a Demo" }));
    expect(screen.getByRole("status")).toHaveTextContent("Enter your name");
    await userEvent.type(screen.getByLabelText("Name"), "Danielle");
    await userEvent.type(screen.getByLabelText("Work email"), "d@example.com");
    await userEvent.type(screen.getByLabelText("Organization"), "Nexx Jenn");
    await userEvent.type(screen.getByLabelText("Current audience size"), "100");
    await userEvent.click(screen.getByRole("button", { name: "Request a Demo" }));
    expect(screen.getByRole("status")).toHaveTextContent("mock form is ready");
  });
});

