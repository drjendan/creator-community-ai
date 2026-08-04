import { z } from "zod";
import { reservedTenantSlugs } from "@/lib/tenant-domains";

const optionalUrl = z.string().trim().url().or(z.literal(""));
export const communityVisibility = ["public", "private_link", "invite_only", "coming_soon", "waitlist", "paused"] as const;
export const supportedFonts = ["Inter", "Manrope", "Georgia", "Arial"] as const;

export const communitySettingsSchema = z.object({
  legalName: z.string().trim().max(160).default(""),
  communityName: z.string().trim().min(2).max(120),
  podcastName: z.string().trim().max(120).default(""),
  displayName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(180).default(""),
  description: z.string().trim().max(5000).default(""),
  tenantType: z.string().trim().max(80).default(""),
  primaryCategory: z.string().trim().max(80).default(""),
  secondaryCategories: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  supportEmail: z.string().trim().email().or(z.literal("")),
  contactEmail: z.string().trim().email().or(z.literal("")),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
  visibility: z.enum(communityVisibility),
  welcomeHeading: z.string().trim().max(200).default(""),
  welcomeMessage: z.string().trim().max(3000).default(""),
  memberHomeCta: z.string().trim().max(100).default(""),
  communityTerminology: z.string().trim().max(40).default("Community"),
  memberSupportUrl: optionalUrl,
  defaultMemberLandingPage: z.enum(["welcome", "library", "community"]),
  allowMemberDirectory: z.boolean(), allowMemberMessaging: z.boolean(), allowMemberDiscussions: z.boolean(), allowMemberContentSearch: z.boolean(),
  primaryCtaLabel: z.string().trim().max(80).default("Join the Community"), primaryCtaUrl: optionalUrl,
  secondaryCtaLabel: z.string().trim().max(80).default("Sign In"), secondaryCtaUrl: optionalUrl,
  aboutPurpose: z.string().trim().max(3000).default(""), founderName: z.string().trim().max(120).default(""),
  intendedAudience: z.string().trim().max(1000).default(""), memberExpectations: z.string().trim().max(2000).default(""), communityValues: z.string().trim().max(1000).default(""),
  websiteUrl: optionalUrl,
  socialLinks: z.record(z.string(), optionalUrl).default({}),
  seoTitle: z.string().trim().max(70).default(""), seoDescription: z.string().trim().max(170).default(""), seoImageUrl: optionalUrl,
  action: z.enum(["draft", "publish"]).default("draft")
}).superRefine((value, context) => {
  if (reservedTenantSlugs.has(value.slug)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["slug"], message: "This community URL is reserved." });
});

export function publicCommunityUrl(slug: string) {
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "upnexx.net").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${slug}.${root}`;
}

export function paymentFeatureFlags() {
  const enabled = (name: string) => process.env[name]?.toLowerCase() === "true";
  return {
    platformBilling: enabled("STRIPE_PLATFORM_BILLING_ENABLED") || enabled("STRIPE_BILLING_ENABLED"),
    stripeConnect: enabled("STRIPE_CONNECT_ENABLED"),
    liveCheckout: enabled("LIVE_CHECKOUT_ENABLED"),
    paidMemberships: enabled("TENANT_PAID_MEMBERSHIPS_ENABLED"),
    productPayments: enabled("TENANT_PRODUCT_PAYMENTS_ENABLED")
  };
}
