export const reservedTenantSlugs = new Set([
  "www", "app", "admin", "api", "auth", "login", "logout", "signup",
  "support", "help", "status", "billing", "payments", "mail", "email",
  "assets", "static", "cdn", "platform", "dashboard", "developer",
  "developers", "docs", "test", "staging", "preview"
]);

export const tenantSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function suggestTenantSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
}

export function validateTenantSlug(slug: string) {
  if (!tenantSlugPattern.test(slug)) {
    return "Use 1–63 lowercase letters, numbers, or interior hyphens.";
  }
  if (reservedTenantSlugs.has(slug)) {
    return "This subdomain is reserved by UpNexx.";
  }
  return null;
}

export function rootDomain() {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "upnexx.net")
    .trim()
    .toLowerCase();
}

export function tenantHostname(slug: string) {
  return `${slug}.${rootDomain()}`;
}

export function tenantOrigin(slug: string) {
  const protocol = rootDomain() === "localhost" ? "http" : "https";
  const port =
    rootDomain() === "localhost" && process.env.NODE_ENV !== "production"
      ? ":3000"
      : "";
  return `${protocol}://${tenantHostname(slug)}${port}`;
}

