import { describe, expect, it } from "vitest";
import { normalizeHost, resolveTenantIdentifier } from "@/lib/tenant";

describe("tenant resolution", () => {
  it("prioritizes the local path pattern", () => {
    expect(resolveTenantIdentifier({ pathname: "/demo/AI-AT-WORK/episodes", host: "x.com" })).toEqual({ slug: "ai-at-work", source: "path" });
  });
  it("resolves UpNexx subdomains and custom domains", () => {
    expect(resolveTenantIdentifier({ host: "ai-at-work.upnexx.net:443" })).toEqual({ slug: "ai-at-work", source: "subdomain" });
    expect(resolveTenantIdentifier({ host: "community.example.org" })).toEqual({ slug: "community.example.org", source: "custom-domain" });
    expect(resolveTenantIdentifier({ host: "www.upnexx.net" })).toBeNull();
    expect(resolveTenantIdentifier({ host: "admin.upnexx.net" })).toBeNull();
  });
  it("normalizes hosts and returns known tenants", () => {
    expect(normalizeHost(" AI-AT-WORK.UpNexx.net:3000 ")).toBe("ai-at-work.upnexx.net");
    expect(resolveTenantIdentifier({})).toBeNull();
  });
});

