"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPreferenceToken } from "@/lib/communications/tokens";

export async function unsubscribe(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const category = String(formData.get("category") ?? "all_marketing");
  const parsed = verifyPreferenceToken(token);
  if (!parsed || !["all_marketing", "newsletters", "announcements", "new_content", "event_reminders", "course_notifications", "membership_reminders", "community_summaries", "direct_messages", "weekly_digest"].includes(category)) {
    redirect(`/communications/unsubscribe?status=invalid`);
  }
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("member_communication_preferences").upsert({
    tenant_id: parsed.tenantId,
    user_id: parsed.userId,
    category,
    email_enabled: false,
    consent_source: "unsubscribe_link",
    unsubscribed_at: now,
    updated_at: now
  }, { onConflict: "tenant_id,user_id,category" });
  if (category === "all_marketing") {
    await admin.from("communication_suppressions").upsert({
      tenant_id: parsed.tenantId,
      user_id: parsed.userId,
      email: parsed.email.toLowerCase(),
      reason: "unsubscribed",
      updated_at: now
    }, { onConflict: "tenant_id,email,reason" });
  }
  redirect(`/communications/unsubscribe?status=success`);
}
