import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const allowDirty = process.argv.includes("--allow-dirty");
const jsonOnly = process.argv.includes("--json");
const blockers = [];
const warnings = [];

const runGit = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
const commitResult = runGit("rev-parse", "HEAD");
const commitSha = commitResult.status === 0 ? commitResult.stdout.trim().toLowerCase() : "";
if (!/^[0-9a-f]{40}$/.test(commitSha)) blockers.push("A valid Git commit SHA could not be resolved.");
const statusResult = runGit("status", "--porcelain", "--untracked-files=all");
const dirtyPaths = statusResult.status === 0 ? statusResult.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
if (dirtyPaths.length && !allowDirty) blockers.push("The release worktree is not clean. Commit the complete release before generating candidate evidence.");
if (dirtyPaths.length && allowDirty) warnings.push(`Dirty-worktree override used for local validation (${dirtyPaths.length} paths). Do not use this digest for approval.`);

const migrationDir = resolve(root, "supabase", "migrations");
const migrations = readdirSync(migrationDir).filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
const numbers = migrations.map((name) => Number(name.slice(0, 4)));
for (let number = 1; number <= 43; number += 1) if (!numbers.includes(number)) blockers.push(`Migration ${String(number).padStart(4, "0")} is missing.`);
if (numbers.at(-1) !== 43) blockers.push(`Expected migration 0043 to be latest; found ${String(numbers.at(-1) ?? 0).padStart(4, "0")}.`);
if (new Set(numbers).size !== numbers.length) blockers.push("Duplicate migration numbers were found.");

const tenantProvisioning = readFileSync(resolve(root, "app", "platform-admin", "tenants", "actions.ts"), "utf8");
const forbiddenProvisioningTargets = [
  "tenant_membership_plans", "email_templates", "communication_automations",
  "communication_messages", "communication_announcements", "email_campaigns",
  "courses", "episodes", "podcast_episodes", "events", "resources", "payments", "usage_metrics"
];
for (const table of forbiddenProvisioningTargets) {
  if (new RegExp(`from\\([\"']${table}[\"']\\)\\.insert`).test(tenantProvisioning)) {
    blockers.push(`Zero Demo Data violation: tenant provisioning inserts into ${table}.`);
  }
}

const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
const requiredEnvironmentNames = [
  "APP_ENV", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_ROOT_DOMAIN", "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "APP_ENCRYPTION_KEY",
  "STRIPE_BILLING_ENABLED", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_CONNECT_WEBHOOK_SECRET",
  "RESEND_API_KEY", "RESEND_WEBHOOK_SECRET", "CUSTOM_DOMAIN_CNAME_TARGET", "CRON_SECRET"
];
for (const name of requiredEnvironmentNames) if (!new RegExp(`^${name}=`, "m").test(envExample)) blockers.push(`.env.example is missing ${name}.`);

const includedRoots = ["app", "components", "docs", "e2e", "lib", "public", "scripts", "supabase", "tests"];
const rootFiles = [".env.example", ".eslintrc.json", ".gitignore", "middleware.ts", "next.config.ts", "package.json", "package-lock.json", "playwright.config.ts", "postcss.config.js", "README.md", "tailwind.config.ts", "tsconfig.json", "vercel.json", "vitest.config.ts", "vitest.setup.ts"];
const files = [];
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const target = resolve(path, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile()) files.push(target);
  }
}
for (const directory of includedRoots) { const path = resolve(root, directory); if (statSync(path).isDirectory()) walk(path); }
for (const file of rootFiles) files.push(resolve(root, file));
files.sort((left, right) => relative(root, left).replaceAll("\\", "/").localeCompare(relative(root, right).replaceAll("\\", "/")));
const hash = createHash("sha256");
for (const file of files) { const name = relative(root, file).replaceAll("\\", "/"); hash.update(`${name}\0`); hash.update(readFileSync(file)); hash.update("\0"); }
const artifactSha256 = hash.digest("hex");

const report = {
  status: blockers.length ? "blocked" : "passed",
  productionOnly: true,
  commitSha,
  artifactSha256,
  migrationRange: "0001-0043",
  zeroDemoDataPolicy: true,
  fileCount: files.length,
  dirtyPathCount: dirtyPaths.length,
  blockers,
  warnings
};
if (jsonOnly) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else {
  process.stdout.write(`Production release preflight: ${report.status.toUpperCase()}\n`);
  process.stdout.write(`Commit: ${commitSha || "unavailable"}\nArtifact SHA-256: ${artifactSha256}\nMigrations: ${report.migrationRange}\nFiles: ${report.fileCount}\n`);
  for (const blocker of blockers) process.stdout.write(`BLOCKER: ${blocker}\n`);
  for (const warning of warnings) process.stdout.write(`WARNING: ${warning}\n`);
  if (!blockers.length) process.stdout.write("Repository checks passed. Live production gates and explicit Platform Owner approval are still required.\n");
}
process.exitCode = blockers.length ? 1 : 0;
