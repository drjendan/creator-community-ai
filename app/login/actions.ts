"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().optional()
});

function safeDestination(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next")
  });

  const destination = safeDestination(parsed.success ? parsed.data.next : undefined);

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email address and password.")}&next=${encodeURIComponent(destination)}`);
  }

  const limit = await enforceRateLimit({ headers: await headers(), scope: "auth.sign_in", identifier: parsed.data.email.toLowerCase(), limit: 10, windowSeconds: 900 });
  if (!limit.allowed) redirect(`/login?error=${encodeURIComponent(limit.unavailable ? "Sign-in protection is temporarily unavailable." : "Too many sign-in attempts. Try again later.")}&next=${encodeURIComponent(destination)}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(destination)}`);
  }

  redirect(destination);
}
