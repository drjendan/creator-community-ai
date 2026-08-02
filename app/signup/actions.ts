"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentAcceptanceVersions } from "@/lib/legal";
import { enforceRateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  acceptLegal: z.literal("on"),
  next: z.string().optional()
});

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    acceptLegal: formData.get("acceptLegal"),
    next: formData.get("next")
  });
  if (!parsed.success) redirect(`/signup?error=${encodeURIComponent("Enter a valid email, use at least 8 password characters, and accept the Terms and Privacy Policy.")}`);
  const requestHeaders = await headers();
  const limit = await enforceRateLimit({ headers: requestHeaders, scope: "auth.sign_up", identifier: parsed.data.email.toLowerCase(), limit: 5, windowSeconds: 3600 });
  if (!limit.allowed) redirect(`/signup?error=${encodeURIComponent(limit.unavailable ? "Signup protection is temporarily unavailable." : "Too many signup attempts. Try again later.")}`);
  const versions = await currentAcceptanceVersions();
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/login`,
      data: { accepted_terms_version: versions.terms, accepted_privacy_version: versions.privacy }
    }
  });
  if (error || !data.user) redirect(`/signup?error=${encodeURIComponent(error?.message ?? "Unable to create the account.")}`);
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const { error: acceptanceError } = await createAdminClient().from("user_legal_acceptance").insert({
    user_id: data.user.id,
    accepted_terms_version: versions.terms,
    accepted_privacy_version: versions.privacy,
    accepted_at: new Date().toISOString(),
    ip_address: forwarded || null,
    user_agent: requestHeaders.get("user-agent")
  });
  if (acceptanceError) {
    await createAdminClient().auth.admin.deleteUser(data.user.id);
    redirect(`/signup?error=${encodeURIComponent("The legal acceptance record could not be saved. Please try again.")}`);
  }
  const destination = parsed.data.next?.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/dashboard";
  if (data.session) redirect(destination);
  redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}&next=${encodeURIComponent(destination)}`);
}
