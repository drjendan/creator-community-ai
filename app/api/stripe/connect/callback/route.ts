import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exchangeStandardConnectCode, retrieveConnectedAccount, stripeAccountValues, verifyConnectState } from "@/lib/stripe-connect";
import { getPlatformAccess } from "@/lib/platform-context";
import { getTenantPermissionSet } from "@/lib/tenant-context";
import { stripeBillingEnabled } from "@/lib/env";

function destination(request: NextRequest, key: "stripe" | "error", value: string) {
  const applicationUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const url = new URL("/dashboard/settings/integrations/payments", applicationUrl);
  url.searchParams.set(key, value);
  return url;
}

export async function GET(request: NextRequest) {
  if (!stripeBillingEnabled()) return NextResponse.redirect(destination(request, "error", "Stripe integration is currently disabled."));
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  if (errorDescription) return NextResponse.redirect(destination(request, "error", errorDescription));
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const state = request.nextUrl.searchParams.get("state") ?? "";
  let stateData: ReturnType<typeof verifyConnectState> = null;
  try { stateData = verifyConnectState(state); } catch { stateData = null; }
  if (!code || !stateData) return NextResponse.redirect(destination(request, "error", "Stripe authorization expired or was invalid."));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== stateData.userId) return NextResponse.redirect(destination(request, "error", "Sign in with the account that started Stripe authorization."));
  const admin = createAdminClient();
  const [{ data: membership }, platformAccess] = await Promise.all([
    admin.from("tenant_memberships").select("id,role").eq("tenant_id", stateData.tenantId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    getPlatformAccess()
  ]);
  const tenantPermissions = membership ? await getTenantPermissionSet(membership.role) : new Set<string>();
  if (!tenantPermissions.has("tenant.billing.manage") && !platformAccess?.permissions.has("platform.tenants.manage")) return NextResponse.redirect(destination(request, "error", "Tenant billing permission is required."));
  try {
    const accountId = await exchangeStandardConnectCode(code);
    const account = await retrieveConnectedAccount(accountId);
    const { error } = await admin.from("tenant_stripe_accounts").upsert({ tenant_id: stateData.tenantId, ...stripeAccountValues(account), connected_by: user.id, disconnected_at: null, disconnected_by: null }, { onConflict: "tenant_id" });
    if (error) throw error;
    await admin.from("audit_logs").insert({ tenant_id: stateData.tenantId, user_id: user.id, action: "tenant.stripe.connected", entity_type: "tenant_stripe_account", metadata: { account_type: "standard" } });
    return NextResponse.redirect(destination(request, "stripe", "connected"));
  } catch (error) {
    return NextResponse.redirect(destination(request, "error", error instanceof Error ? error.message : "Stripe account authorization failed."));
  }
}
