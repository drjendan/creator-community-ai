import Link from "next/link";
import { KeyRound, Mail, Palette } from "lucide-react";
import { Card } from "@/components/ui";
import { getActiveTenantManager } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";

export default async function SettingsPage() {
  const context = await getActiveTenantManager();
  const entitlements = context
    ? await getTenantEntitlements(context.tenant.id, context.supabase)
    : new Map<string, boolean>();
  const canUseAI = entitlements.get("creator_ai_studio") === true;
  const canUseEmail =
    entitlements.get("communication_hub") === true &&
    entitlements.get("communication_byop_email") === true;

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
