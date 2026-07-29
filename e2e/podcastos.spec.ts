import { expect, test } from "@playwright/test";

test("landing page and working calls to action load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Transform your expertise/i })).toBeVisible();
  await page.getByRole("link", { name: "Pricing" }).first().click();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.getByText("$99.99")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book a Demo" }).first()).toHaveAttribute("href", "/request-demo");
});

test("mobile public navigation opens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile regression");
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle mobile navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
});

test("tenant administration is protected", async ({ page }) => {
  await page.goto("/dashboard/communications");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in to UpNexx" })).toBeVisible();
});

test("platform administration is protected", async ({ page }) => {
  await page.goto("/platform-admin/tenants");
  await expect(page).toHaveURL(/\/login/);
});

test("invalid tenants return a not-found response", async ({ page }) => {
  const response = await page.goto("/demo/not-a-real-upnexx-tenant");
  expect(response?.status()).toBe(404);
});

test("unsigned provider webhooks are rejected", async ({ request }) => {
  const response = await request.post("/api/webhooks/resend", { data: { type: "email.delivered" } });
  expect(response.status()).toBe(401);
});

test("scheduled processing requires the cron secret", async ({ request }) => {
  const response = await request.get("/api/cron/communications");
  expect(response.status()).toBe(401);
});

test("invalid preference links do not expose member data", async ({ page }) => {
  await page.goto("/communications/unsubscribe?token=invalid");
  await expect(page.getByRole("heading", { name: /invalid or expired/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/member@example|tenant_id|user_id/i);
});

test.describe("connected tenant member experience", () => {
  test.skip(!process.env.E2E_TENANT_SLUG, "Set E2E_TENANT_SLUG to test a tenant in the connected Supabase project.");

  test("tenant site uses real branding", async ({ page }) => {
    await page.goto(`/demo/${process.env.E2E_TENANT_SLUG}`);
    await expect(page.locator("[data-tenant-id]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Member Home" })).toBeVisible();
  });
});

test.describe("authenticated tenant workflows", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for authenticated workflow tests.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/dashboard|platform-admin/);
  });

  test("team and branding modules are operational routes", async ({ page }) => {
    await page.goto("/dashboard/team");
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Invite Team Member" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send Invitation/i })).toBeVisible();
    await expect(page.getByText("Pending Invitations")).toBeVisible();
    await expect(page.getByText("Team Members")).toBeVisible();
    await page.goto("/dashboard/branding");
    await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
    await expect(page.getByLabel("Upload Logo")).toBeVisible();
    await expect(page.getByText("Live preview")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
  });

  test("Communication Hub respects feature availability", async ({ page }) => {
    await page.goto("/dashboard/communications");
    await expect(page.getByRole("heading", { name: /Communication Hub|not enabled/i })).toBeVisible();
  });
});
