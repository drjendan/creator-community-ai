export const dashboardNavItems = [
  "Overview", "Podcast", "Courses", "Community", "Resources", "Events", "Memberships",
  "AI Studio", "AI Coach", "Members", "Analytics", "Branding", "Team", "Billing", "AI Providers", "Settings"
].map((label) => ({
  label,
  href: label === "Overview"
    ? "/dashboard"
    : label === "AI Providers"
      ? "/dashboard/settings/integrations/ai-providers"
      : `/dashboard/${label.toLowerCase().replaceAll(" ", "-")}`
}));

export const platformNavItems = [
  "Overview", "Tenants", "Subscriptions", "Plans", "Usage", "Support", "Domains",
  "Feature Flags", "Audit Logs", "Platform Settings"
].map((label) => ({
  label,
  href: label === "Overview" ? "/platform-admin" : `/platform-admin/${label.toLowerCase().replaceAll(" ", "-")}`
}));
