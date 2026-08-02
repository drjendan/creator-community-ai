import Link from "next/link";
import {
  BookOpen, CalendarDays, Check, Circle, FileText, MessageSquareText,
  Sparkles, Users
} from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button, Card, CardTitle } from "@/components/ui";
import { getTenantDashboardData } from "@/lib/dashboard-data";
import { terminology } from "@/lib/terminology";

const featureCards = [
  {
    key: "courses",
    title: "Courses",
    empty: "No courses have been created.",
    singular: "course",
    action: "Create Course",
    href: "/dashboard/courses",
    icon: BookOpen
  },
  {
    key: "communityPosts",
    title: "Community",
    empty: "No community activity yet.",
    singular: "community post",
    action: "Open Community",
    href: "/dashboard/community",
    icon: MessageSquareText
  },
  {
    key: "events",
    title: "Events",
    empty: "No upcoming events.",
    singular: "event",
    action: "Create Event",
    href: "/dashboard/events",
    icon: CalendarDays
  },
  {
    key: "resources",
    title: terminology.contentLibrary,
    empty: "No content library items uploaded.",
    singular: "content library item",
    action: "Open Content Library",
    href: "/dashboard/content-library",
    icon: FileText
  },
  {
    key: "membershipPlans",
    title: "Memberships",
    empty: "No membership plans created.",
    singular: "membership plan",
    action: "Create Membership",
    href: "/dashboard/memberships",
    icon: Users
  },
  {
    key: "aiGenerations",
    title: "AI Studio",
    empty: "Ready to create AI-powered content?",
    singular: "saved AI generation",
    action: "Open AI Studio",
    href: "/dashboard/ai-studio",
    icon: Sparkles
  }
] as const;

const cardEntitlement = {
  courses: "courses",
  communityPosts: "community",
  events: "events",
  resources: "resources",
  membershipPlans: "memberships",
  aiGenerations: "creator_ai_studio"
} as const;

export default async function DashboardOverviewPage() {
  const data = await getTenantDashboardData();

  if (!data) {
    return (
      <EmptyState
        title="No organization workspace is available"
        description="Ask a platform administrator to assign your account to an organization."
        icon={Users}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Tenant operations</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">{terminology.tenantAdminHub}</h1>
        <p className="mt-2 text-sm text-brand-600">Manage {data.tenant.name} from current production records.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tenant workspace summary">
        <StatCard label="Active members" value={data.counts.members} />
        <StatCard label="Team members" value={data.counts.teamMembers} />
        <StatCard label="Published content" value={data.counts.publishedContent} />
        <StatCard label="Upcoming events" value={data.counts.events} />
      </section>
      <section className="upnexx-hero overflow-hidden rounded-3xl px-7 py-9 text-white shadow-pop md:px-10">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-highlight-300">Welcome to UpNexx!</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">
          Welcome, {data.tenant.name}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-brand-100">
          You&apos;re only a few steps away from launching your learning and community platform.
        </p>
        <Button href="#getting-started" className="mt-6">Continue Setup</Button>
      </section>

      <section id="getting-started" className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{terminology.gettingStarted}</CardTitle>
              <p className="mt-2 text-sm text-brand-600">Complete these steps to prepare your organization for members.</p>
            </div>
            <p className="rounded-full bg-accent-100 px-3 py-1 text-sm font-bold text-accent-800">{data.progress}% Complete</p>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-brand-100" aria-label={`${data.progress}% complete`}>
            <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${data.progress}%` }} />
          </div>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {data.checklist.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="flex items-center gap-3 rounded-xl border border-brand-100 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
                  {item.complete ? <Check className="h-5 w-5 rounded-full bg-success-soft p-1 text-success-strong" /> : <Circle className="h-5 w-5 text-brand-300" />}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Recent Activity</CardTitle>
          {data.activity.length === 0 ? (
            <div className="mt-5">
              <p className="font-display text-xl font-bold text-brand-900">No recent activity.</p>
              <p className="mt-2 text-sm leading-6 text-brand-600">Invite members or publish content to begin seeing activity.</p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {data.activity.map((item) => (
                <li key={item.id} className="rounded-xl border border-brand-100 p-3">
                  <p className="text-sm font-semibold capitalize text-brand-800">{item.label}</p>
                  <time className="mt-1 block text-xs text-brand-500" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="workspace-readiness-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="workspace-readiness-title" className="font-display text-2xl font-bold text-brand-900">Workspace Readiness</h2>
            <p className="mt-2 text-sm text-brand-600">Live configuration checks from your tenant workspace.</p>
          </div>
          <Button href="/dashboard/support" variant="secondary">Open Support</Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReadinessCard label="Tenant Profile" ready={data.readiness.profileComplete} href="/dashboard/settings" />
          <ReadinessCard label="Branding" ready={data.readiness.brandingComplete} href="/dashboard/branding" />
          <ReadinessCard label="Team Invitations" ready={data.readiness.teamInvited} href="/dashboard/team" />
          <ReadinessCard label="Sender Configuration" ready={data.readiness.senderConnected} href="/dashboard/communications/settings" />
          <ReadinessCard label="Content Setup" ready={data.readiness.contentConfigured} href="/dashboard/content-library" />
          <ReadinessCard label="Membership Setup" ready={data.readiness.membershipConfigured} href="/dashboard/memberships" />
          <ReadinessCard label="Payment Connection" ready={data.readiness.paymentConnected} href="/dashboard/settings/integrations/payments" unavailableLabel="Payments Not Connected" />
          <ReadinessCard label="Support Access" ready href="/dashboard/support" />
        </div>
      </section>

      {data.aiQuickStart && <section id="ai-quick-start" className="scroll-mt-24">
        <Card className={data.aiQuickStart.ready ? "border-success/30 bg-success-soft" : ""}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent-700" /><CardTitle>AI Quick Start</CardTitle></div>
              {data.aiQuickStart.ready ? (
                <p className="mt-2 text-sm text-brand-600">Your verified AI provider is ready. Generate your first source-based content item in AI Studio.</p>
              ) : (
                <>
                  <p className="mt-2 font-bold text-brand-900">Connect an AI Provider</p>
                  <p className="mt-1 text-sm text-brand-600">To use UpNexx AI features, connect your organization&apos;s OpenAI, Anthropic, or Gemini account.</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {data.aiQuickStart.ready ? (
                <Button href="/dashboard/ai-studio">Start AI Quick Start</Button>
              ) : data.aiQuickStart.canConfigure ? (
                <Button href="/dashboard/settings/integrations/ai-providers?returnTo=ai-quick-start">Configure AI Provider</Button>
              ) : (
                <p className="max-w-sm text-sm text-brand-600">AI is not configured for this organization. An organization administrator can connect an AI provider under Organization Settings → AI Providers.</p>
              )}
              {!data.aiQuickStart.ready && <Button href="#getting-started" variant="secondary">Skip for Now</Button>}
            </div>
          </div>
        </Card>
      </section>}

      {data.communicationQuickStart && (
        <section>
          <Card className={data.communicationQuickStart.ready ? "border-success/30 bg-success-soft" : ""}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <CardTitle>Connect Email</CardTitle>
                <p className="mt-2 text-sm text-brand-600">{data.communicationQuickStart.ready ? "Your organization’s Resend provider is connected." : "Connect your organization’s Resend account to send welcome messages, announcements, newsletters, reminders, and campaigns. Your organization pays Resend directly."}</p>
              </div>
              {data.communicationQuickStart.canConfigure && <Button href="/dashboard/communications/settings">{data.communicationQuickStart.ready ? "Manage Email Provider" : "Connect Resend"}</Button>}
            </div>
          </Card>
        </section>
      )}

      <section>
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-900">Build your platform</h2>
          <p className="mt-2 text-sm text-brand-600">These cards reflect your organization&apos;s current data.</p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.filter((feature) => data.enabledFeatures.includes(cardEntitlement[feature.key])).map((feature) => {
            const count = data.counts[feature.key];
            return (
              <EmptyState
                key={feature.key}
                title={count === 0 ? feature.empty : `${count} ${feature.singular}${count === 1 ? "" : "s"}`}
                description={count === 0 ? `Use this workspace to add your first ${feature.singular}.` : `${feature.title} data is loaded from ${data.tenant.name}.`}
                actionLabel={feature.action}
                actionHref={feature.href}
                icon={feature.icon}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ReadinessCard({
  label,
  ready,
  href,
  unavailableLabel = "Setup Needed"
}: {
  label: string;
  ready: boolean;
  href: string;
  unavailableLabel?: string;
}) {
  return (
    <Link href={href} className="rounded-xl border border-brand-200 bg-white p-4 shadow-card transition hover:border-accent-300 hover:-translate-y-0.5">
      <p className="text-sm font-bold text-brand-900">{label}</p>
      <p className={ready ? "mt-2 text-xs font-semibold text-success-strong" : "mt-2 text-xs font-semibold text-warning-strong"}>
        {ready ? "Complete" : unavailableLabel}
      </p>
    </Link>
  );
}
