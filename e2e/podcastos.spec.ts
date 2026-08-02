import { expect, test } from "@playwright/test";

test("landing page and working calls to action load", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Transform your expertise/i })).toBeVisible();
  await page.getByRole("link", { name: "Pricing" }).first().click();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.getByText("$99.99")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book a Demo" }).first()).toHaveAttribute("href", "/request-demo");
});

test("skip navigation and reduced motion remain operable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to application content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#application-content")).toBeFocused();
  expect(await page.locator("html").evaluate((element) => getComputedStyle(element).scrollBehavior)).toBe("auto");
});

test("health endpoint reports named checks without exposing configuration values", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());
  const body = await response.json();
  expect(body).toMatchObject({
    environment: expect.any(String),
    checks: {
      configuration: expect.stringMatching(/passed|failed/),
      database: expect.stringMatching(/passed|failed|not_checked/)
    },
    requestId: expect.any(String)
  });
  expect(JSON.stringify(body)).not.toMatch(/service.role|anon.key|supabase\.co/i);
});

test("mobile public navigation opens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile regression");
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle mobile navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
});

test("public Legal Center pages are branded and searchable", async ({ page }) => {
  for (const path of ["/terms", "/privacy", "/cookies", "/acceptable-use"]) {
    await page.goto(path);
    await expect(page.getByText("Legal Center")).toBeVisible();
    await expect(page.getByLabel(/Search/)).toBeVisible();
    await expect(page.getByText(/Version/)).toBeVisible();
  }
});

test("registration requires legal acceptance", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your UpNexx account" })).toBeVisible();
  const acceptance = page.getByRole("checkbox");
  await expect(acceptance).toBeVisible();
  await expect(acceptance).toHaveAttribute("required", "");
  await expect(page.getByRole("link", { name: "Terms of Service" }).first()).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Policy" }).first()).toHaveAttribute("href", "/privacy");
});

test("tenant administration is protected", async ({ page }) => {
  for (const path of ["/dashboard/communications", "/dashboard/content-library"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in to UpNexx" })).toBeVisible();
  }
});

test("platform administration is protected", async ({ page }) => {
  for (const path of ["/platform-admin/tenants", "/platform-admin/communications", "/platform-admin/support", "/platform-admin/isolation", "/platform-admin/quality"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("platform and tenant administration APIs reject unauthenticated access", async ({ request }) => {
  const [platformTeam, tenantTeam, platformSupport, contentLibrary, platformBilling, memberBilling, aiSources, aiDraft] = await Promise.all([
    request.get("/api/platform/team"),
    request.get("/api/team"),
    request.patch("/api/platform/support", { data: { id: "00000000-0000-0000-0000-000000000000", status: "closed" } }),
    request.get("/api/content-library"),
    request.post("/api/billing/platform", { data: { action: "checkout", planSlug: "creator", interval: "month" } }),
    request.post("/api/billing/member", { data: { action: "subscribe", tenantSlug: "unknown-tenant", planId: "00000000-0000-0000-0000-000000000000", interval: "month" } }),
    request.get("/api/ai/sources"),
    request.patch("/api/ai/generations/00000000-0000-0000-0000-000000000000", { data: { output: ["Unauthorized draft update"], status: "saved" } })
  ]);
  expect(platformTeam.status()).toBe(403);
  expect(tenantTeam.status()).toBe(403);
  expect(platformSupport.status()).toBe(403);
  expect(contentLibrary.status()).toBe(403);
  expect(platformBilling.status()).toBe(403);
  expect(memberBilling.status()).toBe(401);
  expect(aiSources.status()).toBe(403);
  expect(aiDraft.status()).toBe(403);
});

test("invitation acceptance requires the invited authenticated account", async ({ request }) => {
  const token = "a".repeat(43);
  const [platformInvitation, tenantInvitation] = await Promise.all([
    request.post("/api/platform/invitations/accept", { data: { token } }),
    request.post("/api/team/invitations/accept", { data: { token } })
  ]);
  expect(platformInvitation.status()).toBe(401);
  expect(tenantInvitation.status()).toBe(401);
});

test("invalid tenants return a not-found response", async ({ page }) => {
  const response = await page.goto("/demo/not-a-real-upnexx-tenant");
  expect(response?.status()).toBe(404);
});

test("unsigned provider webhooks are rejected", async ({ request }) => {
  const [resend, stripeConnect, stripePlatform] = await Promise.all([
    request.post("/api/webhooks/resend", { data: { type: "email.delivered" } }),
    request.post("/api/webhooks/stripe-connect", { data: { type: "account.updated" } }),
    request.post("/api/webhooks/stripe-platform", { data: { type: "customer.subscription.updated" } })
  ]);
  expect(resend.status()).toBe(401);
  expect([400, 503]).toContain(stripeConnect.status());
  expect([400, 503]).toContain(stripePlatform.status());
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

  test("mobile authenticated navigation remains keyboard operable", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Authenticated mobile regression");
    const group = page.getByRole("button", { name: "Mobile Content" });
    await group.focus(); await page.keyboard.press("Enter");
    await expect(group).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Mobile Content Library" })).toBeVisible();
  });
});

test.describe("authenticated platform quality workflows", () => {
  test.skip(!process.env.E2E_PLATFORM_EMAIL || !process.env.E2E_PLATFORM_PASSWORD, "Set dedicated platform credentials for authenticated platform verification.");
  test.beforeEach(async ({ page }) => { await page.goto("/login"); await page.getByLabel("Email").fill(process.env.E2E_PLATFORM_EMAIL!); await page.getByLabel("Password").fill(process.env.E2E_PLATFORM_PASSWORD!); await page.getByRole("button", { name: "Sign In" }).click(); await page.waitForURL(/platform-admin|dashboard/); });
  test("security evidence consoles enforce authenticated access", async ({ page }) => { for (const path of ["/platform-admin/operations", "/platform-admin/isolation", "/platform-admin/quality"]) { await page.goto(path); await expect(page.getByRole("heading")).toBeVisible(); await expect(page).not.toHaveURL(/\/login/); } });
});
