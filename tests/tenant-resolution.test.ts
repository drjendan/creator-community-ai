import { describe, expect, it } from "vitest";
import { getTenantBySlug, normalizeHost, resolveTenantIdentifier } from "@/lib/tenant";

describe("tenant resolution", () => {
  it("prioritizes the local path pattern", () => {
    expect(resolveTenantIdentifier({ pathname: "/demo/AI-AT-WORK/episodes", host: "x.com" })).toEqual({ slug: "ai-at-work", source: "path" });
  });
  it("resolves UpNexx subdomains and custom domains", () => {
    expect(resolveTenantIdentifier({ host: "ai-at-work.upnexx.com:443" })).toEqual({ slug: "ai-at-work", source: "subdomain" });
    expect(resolveTenantIdentifier({ host: "community.example.org" })).toEqual({ slug: "community.example.org", source: "custom-domain" });
    expect(resolveTenantIdentifier({ host: "www.upnexx.com" })).toBeNull();
  });
  it("normalizes hosts and returns known tenants", () => {
    expect(normalizeHost(" AI-AT-WORK.UpNexx.com:3000 ")).toBe("ai-at-work.upnexx.com");
    expect(getTenantBySlug("AI-AT-WORK")?.name).toBe("AI at Work");
    expect(getTenantBySlug("missing")).toBeNull();
    expect(resolveTenantIdentifier({})).toBeNull();
  });
});

