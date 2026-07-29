import { z } from "zod";

export const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
export const optionalUrlSchema = z.string().url().or(z.literal("")).optional();

export function isReservedPlatformLogo(value?: string | null) {
  if (!value) return false;
  try {
    const path = new URL(value, "https://upnexx.invalid").pathname.toLowerCase();
    return path.endsWith("/nexx-jenn-logo.png") || path.endsWith("/nexx-jenn-mark.png");
  } catch {
    return false;
  }
}

export function withoutReservedTenantLogo<T extends Record<string, unknown> | null>(
  branding: T
) {
  if (!branding || !isReservedPlatformLogo(String(branding.logo_url ?? ""))) {
    return branding;
  }
  return { ...branding, logo_url: null, logo_storage_path: null };
}

export const tenantBrandingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  shortName: z.string().trim().max(40).optional(),
  logoUrl: optionalUrlSchema,
  logoPath: z.string().max(500).optional(),
  squareIconUrl: optionalUrlSchema,
  squareIconPath: z.string().max(500).optional(),
  faviconUrl: optionalUrlSchema,
  faviconPath: z.string().max(500).optional(),
  heroImageUrl: optionalUrlSchema,
  heroImagePath: z.string().max(500).optional(),
  memberWelcomeImageUrl: optionalUrlSchema,
  memberWelcomeImagePath: z.string().max(500).optional(),
  emailLogoUrl: optionalUrlSchema,
  emailLogoPath: z.string().max(500).optional(),
  primaryColor: colorSchema,
  secondaryColor: colorSchema,
  accentColor: colorSchema,
  backgroundColor: colorSchema,
  textColor: colorSchema,
  buttonColor: colorSchema,
  linkColor: colorSchema,
  emailHeaderText: z.string().max(200).optional(),
  emailFooterText: z.string().max(500).optional(),
  welcomeHeadline: z.string().max(200).optional(),
  welcomeMessage: z.string().max(2000).optional(),
  dashboardGreeting: z.string().max(200).optional(),
  memberTerm: z.string().max(40).optional(),
  supportEmail: z.string().email().or(z.literal("")).optional(),
  supportPhone: z.string().max(40).optional(),
  websiteUrl: optionalUrlSchema,
  footerText: z.string().max(500).optional()
});

export function tenantBrandingRow(
  tenantId: string,
  value: z.infer<typeof tenantBrandingSchema>,
  actorId?: string
) {
  return {
    tenant_id: tenantId,
    organization_short_name: value.shortName || null,
    logo_url: isReservedPlatformLogo(value.logoUrl) ? null : value.logoUrl || null,
    logo_storage_path: isReservedPlatformLogo(value.logoUrl) ? null : value.logoPath || null,
    square_icon_url: value.squareIconUrl || null,
    square_icon_storage_path: value.squareIconPath || null,
    favicon_url: value.faviconUrl || null,
    favicon_storage_path: value.faviconPath || null,
    hero_image_url: value.heroImageUrl || null,
    hero_image_storage_path: value.heroImagePath || null,
    member_welcome_image_url: value.memberWelcomeImageUrl || null,
    member_welcome_image_storage_path: value.memberWelcomeImagePath || null,
    email_logo_url: value.emailLogoUrl || null,
    email_logo_storage_path: value.emailLogoPath || null,
    primary_color: value.primaryColor,
    secondary_color: value.secondaryColor,
    accent_color: value.accentColor,
    background_color: value.backgroundColor,
    text_color: value.textColor,
    button_color: value.buttonColor,
    link_color: value.linkColor,
    email_header_text: value.emailHeaderText || null,
    email_footer_text: value.emailFooterText || null,
    welcome_headline: value.welcomeHeadline || null,
    welcome_message: value.welcomeMessage || null,
    member_dashboard_greeting: value.dashboardGreeting || null,
    member_term: value.memberTerm || "Member",
    support_email: value.supportEmail || null,
    support_phone: value.supportPhone || null,
    website_url: value.websiteUrl || null,
    footer_text: value.footerText || null,
    created_by: actorId,
    updated_by: actorId,
    updated_at: new Date().toISOString()
  };
}
