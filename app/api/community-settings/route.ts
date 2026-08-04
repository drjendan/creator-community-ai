import { NextRequest, NextResponse } from "next/server";
import { communitySettingsSchema, publicCommunityUrl } from "@/lib/community-settings";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";

const emptySettings = {
  visibility: "private_link", publication_status: "draft", welcome_heading: "", welcome_message: "", member_home_cta: "",
  community_terminology: "Community", member_support_url: "", default_member_landing_page: "welcome",
  allow_member_directory: false, allow_member_messaging: true, allow_member_discussions: true, allow_member_content_search: true,
  primary_cta_label: "Join the Community", primary_cta_url: "", secondary_cta_label: "Sign In", secondary_cta_url: "",
  about_purpose: "", founder_name: "", intended_audience: "", member_expectations: "", community_values: "", website_url: "",
  social_links: {}, seo_title: "", seo_description: "", seo_image_url: ""
};

export async function GET() {
  const context = await getActiveTenantWithPermission("tenant.settings.manage");
  if (!context) return NextResponse.json({ error: "Community Settings permission is required." }, { status: 403 });
  const [{ data: branding, error: brandingError }, { data: settings, error: settingsError }] = await Promise.all([
    context.supabase.from("tenant_branding").select("*").eq("tenant_id", context.tenant.id).maybeSingle(),
    context.supabase.from("tenant_community_settings").select("*").eq("tenant_id", context.tenant.id).maybeSingle()
  ]);
  if (brandingError || settingsError) return NextResponse.json({ error: "Community Settings migration 0044 is required." }, { status: 503 });
  return NextResponse.json({ tenant: context.tenant, branding: branding ?? {}, settings: settings ?? emptySettings, publicUrl: publicCommunityUrl(context.tenant.slug) });
}

export async function POST(request: NextRequest) {
  const context = await getActiveTenantWithPermission("tenant.settings.manage");
  if (!context) return NextResponse.json({ error: "Community Settings permission is required." }, { status: 403 });
  const parsed = communitySettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the Community Settings fields." }, { status: 400 });
  const value = parsed.data;
  if (value.slug !== context.tenant.slug) {
    const { data: conflict } = await context.supabase.from("tenants").select("id").eq("slug", value.slug).neq("id", context.tenant.id).maybeSingle();
    if (conflict) return NextResponse.json({ error: "That community URL is already in use." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const publicationStatus = value.action === "publish" ? "published" : "draft";
  const [tenantResult, brandingResult, settingsResult] = await Promise.all([
    context.supabase.from("tenants").update({ name: value.communityName, slug: value.slug, updated_at: now }).eq("id", context.tenant.id),
    context.supabase.from("tenant_branding").upsert({
      tenant_id: context.tenant.id, legal_name: value.legalName || null, community_name: value.communityName,
      podcast_name: value.podcastName || null, display_name: value.displayName, tagline: value.tagline || null,
      full_description: value.description || null, tenant_type: value.tenantType || null, primary_category: value.primaryCategory || null,
      secondary_categories: value.secondaryCategories, support_email: value.supportEmail || null,
      public_contact_email: value.contactEmail || null, updated_by: context.user.id, updated_at: now
    }, { onConflict: "tenant_id" }),
    context.supabase.from("tenant_community_settings").upsert({
      tenant_id: context.tenant.id, visibility: value.visibility, publication_status: publicationStatus,
      welcome_heading: value.welcomeHeading || null, welcome_message: value.welcomeMessage || null, member_home_cta: value.memberHomeCta || null,
      community_terminology: value.communityTerminology, member_support_url: value.memberSupportUrl || null,
      default_member_landing_page: value.defaultMemberLandingPage, allow_member_directory: value.allowMemberDirectory,
      allow_member_messaging: value.allowMemberMessaging, allow_member_discussions: value.allowMemberDiscussions,
      allow_member_content_search: value.allowMemberContentSearch, primary_cta_label: value.primaryCtaLabel,
      primary_cta_url: value.primaryCtaUrl || null, secondary_cta_label: value.secondaryCtaLabel,
      secondary_cta_url: value.secondaryCtaUrl || null, about_purpose: value.aboutPurpose || null, founder_name: value.founderName || null,
      intended_audience: value.intendedAudience || null, member_expectations: value.memberExpectations || null,
      community_values: value.communityValues || null, website_url: value.websiteUrl || null, social_links: value.socialLinks,
      seo_title: value.seoTitle || null, seo_description: value.seoDescription || null, seo_image_url: value.seoImageUrl || null,
      published_at: value.action === "publish" ? now : null, published_by: value.action === "publish" ? context.user.id : null, updated_at: now
    }, { onConflict: "tenant_id" })
  ]);
  const error = tenantResult.error || brandingResult.error || settingsResult.error;
  if (error) return NextResponse.json({ error: "Unable to save Community Settings. Confirm migration 0044 is applied." }, { status: 500 });
  await context.supabase.from("audit_logs").insert({ tenant_id: context.tenant.id, user_id: context.user.id, action: value.action === "publish" ? "tenant.public_page.published" : "tenant.community_settings.draft_saved", entity_type: "tenant_community_settings", metadata: { community_name: value.communityName, slug: value.slug, visibility: value.visibility } });
  return NextResponse.json({ saved: true, status: publicationStatus, publicUrl: publicCommunityUrl(value.slug) });
}
