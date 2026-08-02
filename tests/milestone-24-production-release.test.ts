import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0040_production_release_package.sql");
const api = read("app/api/platform/releases/route.ts");
const preflight = read("scripts/production-preflight.mjs");

describe("Milestone 24 production release package", () => {
  it("builds a deterministic production-only repository preflight", () => {
    expect(preflight).toContain('productionOnly: true');
    expect(preflight).toContain('migrationRange: "0001-0040"');
    expect(preflight).toContain("createHash(\"sha256\")");
    expect(preflight).toContain("The release worktree is not clean");
    const result = spawnSync(process.execPath, ["scripts/production-preflight.mjs", "--allow-dirty", "--json"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.status).toBe("passed");
    expect(report.productionOnly).toBe(true);
    expect(report.commitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(report.artifactSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stores immutable candidates and append-only lifecycle events", () => {
    expect(migration).toContain("pg_advisory_xact_lock(55404, 40)");
    expect(migration).toContain("production_release_candidates");
    expect(migration).toContain("production_release_events");
    expect(migration).toContain("revoke insert,update,delete on public.production_release_candidates from anon,authenticated");
    expect(migration).toContain("revoke insert,update,delete on public.production_release_events from anon,authenticated");
    expect(migration).toContain("production_release_events_are_append_only");
    expect(migration).toContain("immutable_release_candidate");
  });

  it("requires clear readiness plus matching passed isolation and quality runs", () => {
    expect(migration).toContain("production_readiness_blocked");
    expect(migration).toContain("matching_rls_verification_required");
    expect(migration).toContain("matching_quality_verification_required");
    expect(migration).toContain("status not in ('passed','waived')");
    expect(migration).toContain("application_version=btrim(target_application_version)");
    expect(migration).toContain("status<>'in_progress'");
  });

  it("rejects stale evidence and separates release approval permission", () => {
    expect(migration).toContain("platform.release.approve");
    expect(migration).toContain("readiness_snapshot_changed");
    expect(migration).toContain("verification_regressed");
    expect(migration).toContain("approved_release_candidate_required");
    expect(api).toContain('requiredPermission = input.action === "approve" || input.action === "release"');
  });

  it("records deployment only after approval with an evidence reference", () => {
    expect(migration).toContain("record_production_release_deployment");
    expect(migration).toContain("deployment_evidence_required");
    expect(migration).toContain("deployment_recorded");
    expect(api).toContain("record_production_release_deployment");
  });
});
