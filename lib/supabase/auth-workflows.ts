import { createClient } from "@/lib/supabase/server";

export async function registerWithEmail(email: string, password: string, redirectTo: string) {
  const supabase = await createClient();
  return supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
}

export async function loginWithEmail(email: string, password: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function logout() {
  const supabase = await createClient();
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const supabase = await createClient();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

// Invitation acceptance remains a trusted server workflow: look up token_hash,
// verify expiration/status, then create membership and role records atomically.
export type InvitationAcceptance = {
  invitationToken: string;
  tenantId: string;
  userId: string;
};

// Tenant selection is kept in server-managed session state; never trust a raw
// browser tenant_id without verifying the active user's membership.
export type TenantSelection = { tenantId: string; tenantSlug: string };
