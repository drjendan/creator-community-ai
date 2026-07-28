export type Role =
  | "platform_owner"
  | "platform_admin"
  | "tenant_owner"
  | "tenant_admin"
  | "content_manager"
  | "community_moderator"
  | "member"
  | "guest";

export type PlanId = "creator" | "growth" | "professional" | "enterprise";
export type EpisodeStatus = "published" | "draft" | "scheduled";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export const platformBranding = {
  applicationName: "UpNexx",
  owner: "Nexx Jenn Technologies",
  tagline: "Transform your expertise into engagement, learning, and revenue.",
  description:
    "UpNexx gives creators one professional platform to publish content, educate their audience, build community, offer memberships, and generate recurring revenue.",
  footer: "Powered by Nexx Jenn Technologies"
};

export const demoTenant: Tenant = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "ai-at-work",
  name: "AI at Work",
  tagline:
    "Practical conversations about how artificial intelligence is changing work, leadership, business, and everyday decision-making.",
  description:
    "AI at Work is a professional podcast for business leaders, entrepreneurs, educators, and working professionals who want to understand artificial intelligence without the hype.",
  primaryColor: "#102a56",
  accentColor: "#7C3AED"
};

export const tenants = [demoTenant] as const;

export const landingNav = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Example", href: "#example" },
  { label: "Resources", href: "#resources" }
] as const;

export const capabilityCards = [
  ["Podcast Hub", "Publish episodes, transcripts, notes, guests, and resources in one branded listening experience."],
  ["Learning Center", "Turn your expertise into structured courses, modules, lessons, and progress-driven learning."],
  ["Member Community", "Create focused spaces where members exchange ideas and deepen relationships."],
  ["Resource Library", "Organize guides, recordings, downloads, and recommended tools for easy discovery."],
  ["Events", "Promote workshops and live sessions with registration, reminders, and replay access."],
  ["Memberships", "Offer free and paid levels with access rules designed around your business model."],
  ["AI Content Tools", "Accelerate show notes, summaries, lesson ideas, and audience communications."],
  ["AI Coach", "Give members a source-grounded guide trained on content you approve."],
  ["Creator Analytics", "Understand engagement across episodes, learning, community, and revenue."],
  ["White-Label Branding", "Create a cohesive experience with your identity, domain, colors, and voice."]
] as const;

export const howUpNexxWorks = [
  ["01", "Build your branded platform", "Choose your identity, structure, access levels, and member experience."],
  ["02", "Add your podcast and resources", "Bring episodes, courses, guides, events, and expertise into one home."],
  ["03", "Invite and engage your audience", "Create meaningful paths for listeners to learn, connect, and return."],
  ["04", "Create recurring revenue", "Offer memberships that turn consistent value into a sustainable business."]
] as const;

export const solutions = [
  ["Podcasters", "Move listeners from a feed into a branded relationship you own."],
  ["Coaches and consultants", "Package expertise into content, learning, and premium access."],
  ["Authors and speakers", "Extend the impact of every book, keynote, and conversation."],
  ["Educators", "Connect audio content to lessons, resources, and peer discussion."],
  ["Churches and ministries", "Support ongoing teaching, connection, and member care."],
  ["Professional communities", "Create a focused knowledge and networking destination."]
] as const;

export const plans = [
  {
    id: "creator",
    name: "Creator",
    price: 49.99,
    priceLabel: "$49.99",
    cadence: "per month",
    button: "Start with Creator",
    features: [
      "One branded UpNexx tenant", "UpNexx subdomain", "Up to 250 members",
      "Up to 50 published podcast episodes", "One administrator", "One community space",
      "One mini-course with up to 10 lessons", "One free membership level",
      "One paid membership level", "Resource library", "Up to two active events",
      "Creator AI content tools", "Basic analytics", "Email support",
      "Powered by Nexx Jenn Technologies attribution"
    ]
  },
  {
    id: "growth",
    name: "Growth",
    price: 99.99,
    priceLabel: "$99.99",
    cadence: "per month",
    button: "Choose Growth",
    popular: true,
    features: [
      "Up to 1,000 members", "Unlimited podcast episodes", "Three administrators",
      "Five courses", "Three community spaces", "Up to three paid membership levels",
      "Custom domain", "Expanded creator AI tools", "Limited member-facing AI Coach",
      "Advanced analytics", "Email notifications", "Reduced UpNexx branding"
    ]
  },
  {
    id: "professional",
    name: "Professional",
    price: 199.99,
    priceLabel: "$199.99",
    cadence: "per month",
    button: "Choose Professional",
    features: [
      "Up to 5,000 members", "Ten administrators", "Unlimited courses",
      "Multiple communities", "Unlimited membership levels", "Advanced AI Coach",
      "Team roles and permissions", "Automations", "Advanced analytics", "Custom domain",
      "Removal of UpNexx branding", "Priority support"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    priceLabel: "Custom",
    cadence: "pricing",
    button: "Contact Sales",
    features: [
      "Higher member limits", "Multiple brands or tenant sites", "SSO", "API access",
      "Custom integrations", "Data migration", "Dedicated onboarding",
      "Service-level agreement", "Enterprise support"
    ]
  }
] as const;

export const demoEpisodes = [
  "How Small Businesses Can Use AI Without a Large Technology Budget",
  "AI Agents: What Business Leaders Need to Know",
  "Human-Centered AI and the Future of Work",
  "Five Business Processes You Can Automate This Month",
  "Responsible AI: Moving Beyond the Policy Document",
  "How Educators Can Prepare Students for an AI-Driven Workplace"
].map((title, index) => ({
  id: `aiw-${index + 1}`,
  title,
  number: index + 1,
  duration: ["34:12", "41:08", "38:45", "29:18", "44:03", "36:50"][index],
  publishDate: `2026-0${index + 1}-15`,
  category: ["Business", "Leadership", "Workplace", "Automation", "Responsible AI", "Education"][index],
  episodeNumber: index + 1,
  status: "published" as EpisodeStatus,
  plays: [842, 719, 608, 551, 497, 424][index],
  tags: [["business", "budget"], ["agents", "leadership"], ["future of work"], ["automation"], ["responsible AI"], ["education"]][index],
  host: "Danielle Carter",
  guest: index % 2 ? "Industry guest" : undefined,
  audioUrl: "#",
  videoId: ["aircAruvnKk", "IHZwWFHWa-w", "Ilg3gGewQ5U", "tIeHLnjs5U8", "wjZofJX0v4M", "eMlx5fFNoYc"][index],
  videoUrl: `https://www.youtube.com/watch?v=${["aircAruvnKk", "IHZwWFHWa-w", "Ilg3gGewQ5U", "tIeHLnjs5U8", "wjZofJX0v4M", "eMlx5fFNoYc"][index]}`,
  videoAttribution: "3Blue1Brown",
  coverImageUrl: "/icon.svg",
  transcript: "Demo transcript content for the AI at Work UpNexx tenant.",
  featured: index === 0,
  resources: [{ label: "Episode guide", href: "#" }],
  description: [
    "A practical playbook for selecting affordable tools and starting with a measurable business problem.",
    "A clear explanation of AI agents, where they create value, and what leaders should evaluate first.",
    "Why the best AI strategies strengthen human judgment, trust, creativity, and meaningful work.",
    "Five approachable workflows that teams can improve this month without a major transformation program.",
    "How leaders can translate responsible-AI principles into daily decisions, controls, and accountability.",
    "The durable skills students need as AI reshapes how people learn, collaborate, and solve problems."
  ][index]
}));

export const membershipPlans = [
  { name: "Listener", price: "Free", description: "Public episodes, weekly notes, and community previews." },
  { name: "AI Insider", price: "$9.99 per month", description: "Full library, courses, resources, and member discussions." },
  { name: "AI Leadership Circle", price: "$29.99 per month", description: "Everything in Insider plus live briefings, replays, and advanced AI Coach access." }
] as const;

export const dashboardNavItems = [
  "Overview", "Podcast", "Courses", "Community", "Resources", "Events", "Memberships",
  "AI Studio", "AI Tools", "AI Coach", "Members", "Analytics", "Branding", "Team", "Billing", "Settings"
].map((label) => ({
  label,
  href: label === "Overview" ? "/dashboard" : `/dashboard/${label.toLowerCase().replaceAll(" ", "-")}`
}));

export const platformNavItems = [
  "Overview", "Tenants", "Subscriptions", "Plans", "Usage", "Support", "Domains",
  "Feature Flags", "Audit Logs", "Platform Settings"
].map((label) => ({
  label,
  href: label === "Overview" ? "/platform-admin" : `/platform-admin/${label.toLowerCase().replaceAll(" ", "-")}`
}));

export const memberNavItems = [
  "Home", "Episodes", "Courses", "Community", "Resources", "Events", "AI Coach", "Membership", "Profile"
].map((label) => ({
  label,
  href: label === "Home"
    ? "/demo/ai-at-work/member"
    : `/demo/ai-at-work/${label.toLowerCase().replaceAll(" ", "-")}`
}));

export function getPlan(id: PlanId) {
  return plans.find((plan) => plan.id === id);
}

export function annualPlanPrice(id: PlanId) {
  const plan = getPlan(id);
  return plan?.price === null || plan?.price === undefined
    ? null
    : Number((plan.price * 12).toFixed(2));
}

export const dashboardSummary = {
  totalMembers: 1284,
  publishedEpisodes: demoEpisodes.length,
  activeCourses: 3,
  upcomingEvents: 3,
  aiCoachConversations: 947,
  monthlyEngagement: "72%"
};
export const communityActivity = [
  "32 new replies in the AI Leadership community.",
  "18 members completed Responsible AI in Practice.",
  "41 members registered for the next leadership briefing."
] as const;
export const creatorRecommendations = [
  "Turn Episode 4 into a five-lesson automation mini-course.",
  "Invite AI Insider members to the Responsible AI roundtable.",
  "Publish a resource checklist with Episode 2."
] as const;
export const upcomingEvents = [
  { title: "AI Leadership Briefing", date: "Aug 12, 2026", format: "Live online" },
  { title: "Responsible AI Roundtable", date: "Sep 03, 2026", format: "Member session" },
  { title: "Workflow Automation Lab", date: "Sep 24, 2026", format: "Workshop" }
] as const;
export function getEpisodeById(id: string) {
  return demoEpisodes.find((episode) => episode.id === id);
}

