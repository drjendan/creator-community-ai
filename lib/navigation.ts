export const dashboardNavItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Podcast", href: "/dashboard/podcast", featureKey: "podcasts" },
  { label: "Courses", href: "/dashboard/courses", featureKey: "courses" },
  { label: "Community", href: "/dashboard/community", featureKey: "community" },
  { label: "Resources", href: "/dashboard/resources", featureKey: "resources" },
  { label: "Events", href: "/dashboard/events", featureKey: "events" },
  { label: "Memberships", href: "/dashboard/memberships", featureKey: "memberships" },
  { label: "Members", href: "/dashboard/members" },
  { label: "AI Studio", href: "/dashboard/ai-studio", featureKey: "creator_ai_studio" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Communication Hub", href: "/dashboard/communications", featureKey: "communication_hub" },
  { label: "Announcements", href: "/dashboard/communications/announcements", featureKey: "communication_announcements" },
  { label: "Messages", href: "/dashboard/communications/messages", featureKey: "communication_direct_messages" },
  { label: "Email Campaigns", href: "/dashboard/communications/campaigns", featureKey: "communication_email_campaigns" },
  { label: "Templates", href: "/dashboard/communications/templates", featureKey: "communication_templates" },
  { label: "Audience Segments", href: "/dashboard/communications/segments", featureKey: "communication_segments" },
  { label: "Scheduled", href: "/dashboard/communications/scheduled", featureKey: "communication_scheduling" },
  { label: "Reports", href: "/dashboard/communications/reports", featureKey: "communication_reports" },
  { label: "Email Provider", href: "/dashboard/communications/settings", featureKey: "communication_byop_email" },
  { label: "Branding", href: "/dashboard/branding" },
  { label: "Team", href: "/dashboard/team" },
  { label: "AI Providers", href: "/dashboard/settings/integrations/ai-providers", featureKey: "creator_ai_studio" },
  { label: "Payments", href: "/dashboard/settings/integrations/payments" },
  { label: "Settings", href: "/dashboard/settings" }
];

export const platformNavItems = [
  "Overview", "Tenants", "Platform Settings"
].map((label) => ({
  label,
  href: label === "Overview" ? "/platform-admin" : `/platform-admin/${label.toLowerCase().replaceAll(" ", "-")}`
}));
