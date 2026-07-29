import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

describe("production-facing shell scan", () => {
  it("does not expose MVP, prototype, future-phase, or coming-soon language", () => {
    const files = execFileSync("rg", ["--files", "app", "components", "-g", "*.tsx"], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
    const productionSource = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(productionSource).not.toMatch(/\bMVP\b|MVP shell|future phase|coming soon|not yet implemented|will be connected|prototype/i);
  });

  it("does not expose empty hash navigation links", () => {
    const files = execFileSync("rg", ["--files", "app", "components", "-g", "*.tsx"], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
    const productionSource = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(productionSource).not.toMatch(/href\s*=\s*["']#["']/);
  });
});
