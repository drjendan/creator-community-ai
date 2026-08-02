"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAcceptanceVersions } from "@/lib/legal";

export async function acceptCurrentLegal(formData: FormData) {
  if (formData.get("acceptLegal") !== "on") redirect("/legal/accept?error=Acceptance%20is%20required.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const versions = await currentAcceptanceVersions();
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const { error } = await createAdminClient().from("user_legal_acceptance").insert({
    user_id: user.id,
    accepted_terms_version: versions.terms,
    accepted_privacy_version: versions.privacy,
    accepted_at: new Date().toISOString(),
    ip_address: forwarded || null,
    user_agent: requestHeaders.get("user-agent")
  });
  if (error) redirect("/legal/accept?error=Unable%20to%20record%20acceptance.");
  const next = String(formData.get("next") ?? "/dashboard");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}
