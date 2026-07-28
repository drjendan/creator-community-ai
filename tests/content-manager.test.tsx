import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TenantContentManager } from "@/components/dashboard/TenantContentManager";

describe("tenant content loading", () => {
  afterEach(() => vi.restoreAllMocks());

  it("replaces the loading state with returned content", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "episode-1", title: "Launch episode", status: "published", access_level: "member" }],
        tenant: { slug: "ai-at-work" }
      })
    } as Response);

    render(<TenantContentManager type="episodes" />);

    expect(screen.getByText("Loading podcast…")).toBeInTheDocument();
    expect(await screen.findByText("Launch episode")).toBeInTheDocument();
    expect(screen.queryByText(/Loading podcast/)).not.toBeInTheDocument();
  });

  it("exits the loading state when the request fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));

    render(<TenantContentManager type="courses" />);

    await waitFor(() => expect(screen.queryByText(/Loading courses/)).not.toBeInTheDocument());
    expect(screen.getByText("Unable to load content. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.getByText("No courses yet")).toBeInTheDocument();
  });
});
