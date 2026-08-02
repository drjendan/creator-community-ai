import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantCommunicator } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getActiveEmailProvider } from "@/lib/communications/configuration";
import { trialMutationError } from "@/lib/trials";

const schema = z.object({ email: z.string().email() });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getActiveTenantCommunicator();
  if (!context) {
    return NextResponse.json(
      { error: "Communication management access is required." },
      { status: 403 }
    );
  }
  const trialError = await trialMutationError(context.tenant.id, "campaign");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const entitlements = await getTenantEntitlements(
    context.tenant.id,
    context.supabase
  );
  if (
    entitlements.get("communication_hub") !== true ||
    entitlements.get("communication_email_campaigns") !== true
  ) {
    return NextResponse.json(
      { error: "Email campaigns are not enabled." },
      { status: 403 }
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid test email address." },
      { status: 400 }
    );
  }
  const { id } = await params;
  const { data: campaign } = await context.supabase
    .from("email_campaigns")
    .select("subject,html_content,plain_text_content")
    .eq("id", id)
    .eq("tenant_id", context.tenant.id)
    .maybeSingle();
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  const provider = await getActiveEmailProvider(
    context.supabase,
    context.tenant.id
  );
  if (!provider) {
    return NextResponse.json(
      { error: "Connect and test an email provider first." },
      { status: 400 }
    );
  }
  const result = await provider.adapter.sendTestEmail({
    fromName: provider.config.from_name,
    fromEmail: provider.config.from_email,
    replyTo: provider.config.reply_to_email,
    to: [parsed.data.email],
    subject: `[TEST] ${campaign.subject}`,
    html: campaign.html_content,
    text: campaign.plain_text_content
  });
  if (!result.accepted) {
    return NextResponse.json(
      { error: result.error ?? "The provider rejected the test email." },
      { status: 400 }
    );
  }
  return NextResponse.json({ accepted: true });
}
