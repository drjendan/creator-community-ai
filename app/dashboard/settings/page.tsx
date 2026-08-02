import Link from "next/link";
import { Bot, CreditCard, Globe2, KeyRound, Mail, Palette, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { getActiveTenantManager, getTenantPermissionSet } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { getTenantTrialAccess } from "@/lib/trials";

export default async function SettingsPage() {
  const context = await getActiveTenantManager();
  const entitlements = context
    ? await getTenantEntitlements(context.tenant.id, context.supabase)
    : new Map<string, boolean>();
  const canUseAI = entitlements.get("creator_ai_studio") === true;
  const canUseEmail =
    entitlements.get("communication_hub") === true &&
    entitlements.get("communication_byop_email") === true;
  const subscription = context ? await getTenantTrialAccess(context.tenant.id) : null;
  const permissions = context ? await getTenantPermissionSet(context.role) : new Set<string>();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">
          Organization Settings
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          Manage configuration for the current organization workspace.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {permissions.has("tenant.domains.manage") && <Link href="/dashboard/settings/domains">
          <Card className="h-full transition hover:border-accent-400"><Globe2 className="h-6 w-6 text-accent-700" /><h2 className="mt-4 font-display text-lg font-bold text-brand-900">Custom Domains</h2><p className="mt-2 text-sm text-brand-600">Request a hostname and follow the evidence-backed DNS, SSL, activation, and rollback lifecycle.</p></Card>
        </Link>}
        {permissions.has("tenant.data.manage") && <Link href="/dashboard/settings/data-governance">
          <Card className="h-full transition hover:border-accent-400">
            <ShieldCheck className="h-6 w-6 text-accent-700" />
            <h2 className="mt-4 font-display text-lg font-bold text-brand-900">Data Governance</h2>
            <p className="mt-2 text-sm text-brand-600">Review member data-rights requests and export the tenant audit history.</p>
          </Card>
        </Link>}
        {subscription && (
          <Link href="/dashboard/billing">
            <Card className="h-full transition hover:border-accent-400">
              <CreditCard className="h-6 w-6 text-accent-700" />
              <h2 className="mt-4 font-display text-lg font-bold text-brand-900">Subscription · {subscription.subscriptionType}</h2>
              <p className="mt-2 text-sm text-brand-600">
                {subscription.isTrial
                  ? `${subscription.daysRemaining} ${subscription.daysRemaining === 1 ? "day" : "days"} remaining in this trial.`
                  : "Review the organization subscription and available plans."}
              </p>
            </Card>
          </Link>
        )}
        {canUseAI && (
          <Link href="/dashboard/settings/integrations/ai-providers">
            <Card className="h-full transition hover:border-accent-400">
              <KeyRound className="h-6 w-6 text-accent-700" />
              <h2 className="mt-4 font-display text-lg font-bold text-brand-900">
                Integrations · AI Providers
              </h2>
              <p className="mt-2 text-sm text-brand-600">
                Add, test, replace, enable, disable, or remove this
                organization&apos;s provider credentials.
              </p>
            </Card>
          </Link>
        )}
        {canUseAI && (
          <Link href="/dashboard/settings/ai-coach">
            <Card className="h-full transition hover:border-accent-400">
              <Bot className="h-6 w-6 text-accent-700" />
              <h2 className="mt-4 font-display text-lg font-bold text-brand-900">Member AI Coach</h2>
              <p className="mt-2 text-sm text-brand-600">Configure guidance, safety language, approved knowledge, citations, privacy, and limits.</p>
            </Card>
          </Link>
        )}
        <Link href="/dashboard/branding">
          <Card className="h-full transition hover:border-accent-400">
            <Palette className="h-6 w-6 text-accent-700" />
            <h2 className="mt-4 font-display text-lg font-bold text-brand-900">
              Organization Profile &amp; Branding
            </h2>
            <p className="mt-2 text-sm text-brand-600">
              Manage organization identity, support details, colors, images,
              member welcome content, and email branding.
            </p>
          </Card>
        </Link>
        <Link href="/dashboard/settings/integrations/payments">
          <Card className="h-full transition hover:border-accent-400">
            <CreditCard className="h-6 w-6 text-accent-700" />
            <h2 className="mt-4 font-display text-lg font-bold text-brand-900">
              Integrations · Payments
            </h2>
            <p className="mt-2 text-sm text-brand-600">
              Connect Stripe now or later. Free plans remain available without a payment provider.
            </p>
          </Card>
        </Link>
        {canUseEmail && (
          <Link href="/dashboard/communications/settings">
            <Card className="h-full transition hover:border-accent-400">
              <Mail className="h-6 w-6 text-accent-700" />
              <h2 className="mt-4 font-display text-lg font-bold text-brand-900">
                Integrations · Email Provider
              </h2>
              <p className="mt-2 text-sm text-brand-600">
                Connect and test this organization&apos;s Resend account.
              </p>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
