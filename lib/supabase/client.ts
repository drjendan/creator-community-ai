import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function browserEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase browser environment variables.");
  }

  return { url, key };
}

export function createClient() {
  const { url, key } = browserEnvironment();
  return createBrowserClient(url, key);
}

// Password recovery links are often opened in an email client's browser or on a
// different device. Use the client-only implicit flow for recovery so the link
// does not depend on a PKCE verifier stored in the browser that requested it.
// Normal UpNexx authentication continues to use the SSR/PKCE browser client.
export function createPasswordRecoveryClient() {
  const { url, key } = browserEnvironment();
  return createSupabaseClient(url, key, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });
}
