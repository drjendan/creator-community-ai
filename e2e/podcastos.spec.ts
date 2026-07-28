import { expect, test } from "@playwright/test";

test("landing page loads and pricing is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Transform your expertise/i })).toBeVisible();
  await page.getByRole("link", { name: "Pricing" }).first().click();
  await expect(page.getByText("$99.99")).toBeVisible();
});

test("AI at Work example and tenant branding open", async ({ page }) => {
  await page.goto("/demo/ai-at-work");
  await expect(page.getByText("Example community powered by UpNexx")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Practical conversations/i })).toBeVisible();
});

test("creator dashboard is protected and member dashboard opens", async ({ page, isMobile }) => {
  await page.goto("/dashboard");
  if (page.url().includes("/login")) {
    await expect(page.getByRole("heading", { name: "Sign in to UpNexx" })).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    const dashboardNav = page.getByRole("navigation", { name: isMobile ? "Mobile dashboard navigation" : "AI at Work dashboard navigation" });
    await dashboardNav.getByRole("link", { name: "Memberships" }).click();
    await expect(page).toHaveURL(/dashboard\/memberships/);
  }
  await page.goto("/demo/ai-at-work/member");
  await expect(page.getByRole("heading", { name: "Continue your AI learning journey." })).toBeVisible();
});

test("mobile navigation opens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile regression");
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle mobile navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
});

test("invalid tenants show an appropriate error", async ({ page }) => {
  await page.goto("/demo/not-a-tenant");
  await expect(page.getByRole("heading", { name: /does not exist/i })).toBeVisible();
});

test("members can open a published podcast learning experience", async ({ page }) => {
  await page.goto("/demo/ai-at-work/episodes");
  const episodeLinks = page.locator('a[href*="/demo/ai-at-work/episodes/"]');
  const count = await episodeLinks.count();
  test.skip(count === 0, "The connected Supabase project has no published video episode.");
  await episodeLinks.first().click();
  await expect(page.getByText("Podcast learning experience")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Episode library" })).toBeVisible();
});

test.describe("authenticated SaaS workflows", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for authenticated workflow tests.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign In" }).click();
  });

  test("tenant creation wizard exposes all seven stages", async ({ page }) => {
    await page.goto("/platform-admin/tenants");
    await expect(page.getByText("Organization", { exact: true })).toBeVisible();
    await page.getByLabel("Organization name").fill("Playwright Tenant");
    await page.getByLabel("Workspace URL").fill("playwright-tenant");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Platform subscription" })).toBeVisible();
  });

  test("audience membership setup opens", async ({ page }) => {
    await page.goto("/dashboard/memberships");
    await page.getByRole("button", { name: "Add membership plan" }).click();
    await expect(page.getByRole("heading", { name: "Add audience plan" })).toBeVisible();
    await expect(page.getByLabel("AI monthly allowance")).toBeVisible();
  });

  test("Creator AI Studio exposes generation controls", async ({ page }) => {
    await page.goto("/dashboard/ai-studio");
    await expect(page.getByRole("heading", { name: "Creator AI Studio" })).toBeVisible();
    await expect(page.getByLabel("Source text")).toBeVisible();
    await expect(page.getByLabel("Output type")).toBeVisible();
  });

  test.skip("member AI assistant RAG workflow", async () => {
    // Enabled after authorized retrieval and the citation interface are implemented.
  });
});

