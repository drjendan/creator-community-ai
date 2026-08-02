import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const layout = read("app/layout.tsx"); const css = read("app/globals.css"); const announcer = read("components/accessibility/RouteAnnouncer.tsx");
const dialog = read("components/feedback/ConfirmationDialog.tsx"); const focus = read("lib/use-dialog-focus.ts");
const migration = read("supabase/migrations/0038_accessibility_critical_path_verification.sql"); const api = read("app/api/platform/quality/route.ts");

describe("Milestone 22 accessibility and authenticated critical paths", () => {
  it("provides global skip navigation and route announcements", () => {
    expect(layout).toContain('href="#application-content"');
    expect(layout).toContain('id="application-content"');
    expect(layout).toContain("<RouteAnnouncer />");
    expect(announcer).toContain('aria-live="polite"');
    expect(announcer).toContain("document.querySelector(\"h1\")");
  });

  it("honors reduced motion and retains visible keyboard focus", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("scroll-behavior: auto !important");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 3px solid var(--upnexx-cyan)");
  });

  it("contains modal focus, handles Escape, and restores focus", () => {
    expect(dialog).toContain("useDialogFocus");
    expect(dialog).toContain('aria-describedby="confirmation-description"');
    expect(focus).toContain('event.key === "Escape"');
    expect(focus).toContain('event.key !== "Tab"');
    expect(focus).toContain("previous?.focus()");
  });

  it("creates production-only quality evidence without fabricated passes", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 38)");
    expect(migration).toContain("quality_verification_runs");
    expect(migration).toContain("check(environment='production')");
    expect(migration).toContain("status text not null default 'pending'");
    expect(migration).toContain("pending_quality_results");
    expect(migration).toContain("status in ('failed','blocked')");
  });

  it("protects and audits the quality workflow", () => {
    expect(migration).toContain("platform.quality.manage");
    expect(migration).toContain("revoke insert,update,delete on public.quality_verification_results from anon,authenticated");
    expect(api).toContain('getPlatformAdministrator("platform.quality.manage")');
    expect(api).toContain("platform.quality_verification.started");
    expect(api).toContain("platform.quality_verification.${input.status}");
  });
});
