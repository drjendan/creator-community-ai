export const landingNav = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
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

export const solutions = [
  ["Podcasters", "Move listeners from a feed into a branded relationship you own."],
  ["Coaches and consultants", "Package expertise into content, learning, and premium access."],
  ["Authors and speakers", "Extend the impact of every book, keynote, and conversation."],
  ["Educators", "Connect audio content to lessons, resources, and peer discussion."],
  ["Churches and ministries", "Support ongoing teaching, connection, and member care."],
  ["Professional communities", "Create a focused knowledge and networking destination."]
] as const;

export const plans = [
  { id: "creator", name: "Creator", price: 49.99, priceLabel: "$49.99", cadence: "per month", button: "Start with Creator", features: ["One branded UpNexx tenant", "UpNexx subdomain", "Up to 250 members", "One administrator", "Podcast and resource publishing", "Courses, community, events, and memberships", "Creator AI content tools", "Email support"] },
  { id: "growth", name: "Growth", price: 99.99, priceLabel: "$99.99", cadence: "per month", button: "Choose Growth", popular: true, features: ["Up to 1,000 members", "Unlimited podcast episodes", "Three administrators", "Five courses", "Three community spaces", "Custom domain", "Expanded creator AI tools"] },
  { id: "professional", name: "Professional", price: 199.99, priceLabel: "$199.99", cadence: "per month", button: "Choose Professional", features: ["Up to 5,000 members", "Ten administrators", "Unlimited courses", "Multiple communities", "Unlimited membership levels", "Advanced AI Coach", "Team roles and permissions", "Priority support"] },
  { id: "enterprise", name: "Enterprise", price: null, priceLabel: "Custom", cadence: "pricing", button: "Contact Sales", features: ["Higher member limits", "Multiple brands or tenant sites", "SSO", "API access", "Custom integrations", "Data migration", "Dedicated onboarding", "Service-level agreement"] }
] as const;
