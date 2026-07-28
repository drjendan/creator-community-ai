import Link from "next/link";
import { KeyRound, Settings } from "lucide-react";
import { Card } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Organization Settings</h1>
        <p className="mt-2 text-sm text-brand-600">Manage configuration for the current organization workspace.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/settings/integrations/ai-providers">
          <Card className="h-full transition hover:border-accent-400">
            <KeyRound className="h-6 w-6 text-accent-700" />
            <h2 className="mt-4 font-display text-lg font-bold text-brand-900">Integrations · AI Providers</h2>
            <p className="mt-2 text-sm text-brand-600">Add, test, replace, enable, disable, or remove this organization&apos;s provider credentials.</p>
          </Card>
        </Link>
        <Card>
          <Settings className="h-6 w-6 text-brand-500" />
          <h2 className="mt-4 font-display text-lg font-bold text-brand-900">Organization profile</h2>
          <p className="mt-2 text-sm text-brand-600">Additional profile settings will appear here as they become available.</p>
        </Card>
      </div>
    </div>
  );
}
