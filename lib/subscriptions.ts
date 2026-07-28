export const tenantTypes = [
  "podcaster", "educator", "coach", "consultant", "church_ministry",
  "therapist_wellness", "author_speaker", "association", "nonprofit", "other"
] as const;
export type TenantType = (typeof tenantTypes)[number];

export const tenantTypeLabels: Record<TenantType, string> = {
  podcaster: "Podcaster",
  educator: "Educator",
  coach: "Coach",
  consultant: "Consultant",
  church_ministry: "Church or ministry",
  therapist_wellness: "Therapist or wellness",
  author_speaker: "Author or speaker",
  association: "Association",
  nonprofit: "Nonprofit",
  other: "Other"
};

export const platformPlanSlugs = [
  "creator", "growth", "professional", "enterprise", "trial", "complimentary", "custom"
] as const;
export type PlatformPlanSlug = (typeof platformPlanSlugs)[number];

export const featureCatalog = [
  { key: "podcasts", label: "Podcasts" },
  { key: "courses", label: "Courses" },
  { key: "resources", label: "Resources" },
  { key: "events", label: "Events" },
  { key: "community", label: "Community" },
  { key: "memberships", label: "Audience memberships" },
  { key: "creator_ai_studio", label: "Creator AI Studio" },
  { key: "member_ai_assistant", label: "Member AI Assistant" },
  { key: "recommendations", label: "Recommendations" },
  { key: "administrator_ai_insights", label: "Administrator AI Insights" }
] as const;

export const membershipTemplateIds = [
  "free_premium", "free_premium_vip", "course_membership", "coaching_program",
  "church_membership", "association_membership", "custom"
] as const;
export type MembershipTemplateId = (typeof membershipTemplateIds)[number];

export type MembershipTemplatePlan = {
  name: string;
  description: string;
  planType: "free" | "paid";
  monthlyPrice: number;
  annualPrice: number;
  communityAccess: boolean;
  aiAccess: boolean;
  aiMonthlyAllowance: number;
  sortOrder: number;
};

export const membershipTemplates: Record<MembershipTemplateId, { label: string; plans: MembershipTemplatePlan[] }> = {
  free_premium: {
    label: "Free and Premium",
    plans: [
      { name: "Free", description: "Public content and community previews.", planType: "free", monthlyPrice: 0, annualPrice: 0, communityAccess: false, aiAccess: false, aiMonthlyAllowance: 0, sortOrder: 0 },
      { name: "Premium", description: "Full member content and community access.", planType: "paid", monthlyPrice: 9.99, annualPrice: 99, communityAccess: true, aiAccess: true, aiMonthlyAllowance: 100, sortOrder: 1 }
    ]
  },
  free_premium_vip: {
    label: "Free, Premium, and VIP",
    plans: [
      { name: "Free", description: "Public content and previews.", planType: "free", monthlyPrice: 0, annualPrice: 0, communityAccess: false, aiAccess: false, aiMonthlyAllowance: 0, sortOrder: 0 },
      { name: "Premium", description: "Courses, resources, events, and community.", planType: "paid", monthlyPrice: 9.99, annualPrice: 99, communityAccess: true, aiAccess: true, aiMonthlyAllowance: 100, sortOrder: 1 },
      { name: "VIP", description: "Premium access plus high-touch experiences.", planType: "paid", monthlyPrice: 29.99, annualPrice: 299, communityAccess: true, aiAccess: true, aiMonthlyAllowance: 500, sortOrder: 2 }
    ]
  },
  course_membership: { label: "Course Membership", plans: [{ name: "Learning Pass", description: "Access to courses, lessons, and learning resources.", planType: "paid", monthlyPrice: 19.99, annualPrice: 199, communityAccess: true, aiAccess: true, aiMonthlyAllowance: 150, sortOrder: 0 }] },
  coaching_program: { label: "Coaching Program", plans: [{ name: "Coaching Member", description: "Coaching resources, events, community, and AI support.", planType: "paid", monthlyPrice: 49, annualPrice: 490, communityAccess: true, aiAccess: true, aiMonthlyAllowance: 300, sortOrder: 0 }] },
  church_membership: { label: "Church Membership", plans: [{ name: "Community Member", description: "Messages, studies, resources, and gatherings.", planType: "free", monthlyPrice: 0, annualPrice: 0, communityAccess: true, aiAccess: false, aiMonthlyAllowance: 0, sortOrder: 0 }] },
  association_membership: { label: "Association Membership", plans: [{ name: "Association Member", description: "Member education, resources, events, and discussions.", planType: "paid", monthlyPrice: 15, annualPrice: 150, communityAccess: true, aiAccess: true, aiMonthlyAllowance: 100, sortOrder: 0 }] },
  custom: { label: "Custom", plans: [] }
};

export function creditsRemaining(allowance: number, used: number) {
  return Math.max(0, allowance - used);
}

export function canConsumeCredits(allowance: number, used: number, requested: number) {
  return requested >= 0 && used + requested <= allowance;
}

export function terminologyFor(type: TenantType) {
  if (type === "educator") return { audience: "Learners", content: "Learning content", primary: "Courses" };
  if (type === "coach" || type === "consultant") return { audience: "Clients", content: "Programs", primary: "Coaching" };
  if (type === "church_ministry") return { audience: "Community", content: "Messages and studies", primary: "Ministry" };
  if (type === "association") return { audience: "Members", content: "Member resources", primary: "Association" };
  return { audience: "Members", content: "Content", primary: "Podcast" };
}
