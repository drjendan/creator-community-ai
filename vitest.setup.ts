import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  redirect: vi.fn()
}));
vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => React.createElement("img", props)
}));
