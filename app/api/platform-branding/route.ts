import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAdministrator } from "@/lib/platform-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  colorSchema,
  optionalUrlSchema
} from "@/lib/branding-settings";

const schema = z.object({
  platformName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200),
  logoUrl: optionalUrlSchema,
  squareIconUrl: optionalUrlSchema,
  faviconUrl: optionalUrlSchema,
  primaryColor: colorSchema,
  accentColor: colorSchema,
  backgroundColor: colorSchema,
  textColor: colorSchema,
  supportEmail: z.string().email().or(z.literal("")).optional(),
  websiteUrl: optionalUrlSchema,
  footerText: z.string().max(500).optional()
});

export async function GET() {
  if (!(await getPlatformAdministrator("platform.settings.manage"))) {
    return NextResponse.json(
      { error: "Platform administrator access is required." },
      { status: 403 }
    );
  }
  const { data, error } = await createAdminClient()
    .from("platform_branding")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "Unable to load platform branding." },
      { status: 500 }
    );
  }
  return NextResponse.json({ branding: data });
}

export async function POST(request: NextRequest) {
  const context = await getPlatformAdministrator("platform.settings.manage");
  if (!context) {
    return NextResponse.json(
      { error: "Platform administrator access is required." },
      { status: 403 }
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid platform branding." },
      { status: 400 }
    );
  }
  const value = parsed.data;
  const { error } = await createAdminClient()
    .from("platform_branding")
    .upsert({
      id: true,
      platform_name: value.platformName,
      tagline: value.tagline,
      logo_url: value.logoUrl || null,
      square_icon_url: value.squareIconUrl || null,
      favicon_url: value.faviconUrl || null,
      primary_color: value.primaryColor,
      accent_color: value.accentColor,
      background_color: value.backgroundColor,
      text_color: value.textColor,
      support_email: value.supportEmail || null,
      website_url: value.websiteUrl || null,
      footer_text: value.footerText || null,
      updated_by: context.user.id,
      updated_at: new Date().toISOString()
    });
  if (error) {
    return NextResponse.json(
      { error: "Unable to save platform branding." },
      { status: 500 }
    );
  }
  return NextResponse.json({ saved: true });
}
