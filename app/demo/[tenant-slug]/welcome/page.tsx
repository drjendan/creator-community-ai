/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, FileText, Mail, UserRound } from "lucide-react";
import { Card, Container } from "@/components/ui";
import { EmptyState } from "@/components/feedback/EmptyState";
import { getTenantMemberContext } from "@/lib/communications/member-context";
import {
  getPublishedCourses,
  getPublishedEvents,
  getPublishedResources
} from "@/lib/content/member-library";
import { getPublishedEpisodes } from "@/lib/content/member-episodes";
import { MemberRecommendations } from "@/components/tenant/MemberRecommendations";

export default async function WelcomePage({
  params
}: {
  params: Promise<{ "tenant-slug": string }>;
}) {
  const { "tenant-slug": slug } = await params;
  const context = await getTenantMemberContext(slug);
  if (!context) {
    redirect(`/login?next=${encodeURIComponent(`/demo/${slug}/welcome`)}`);
  }

  const { data: entitlementRows } = await context.supabase
    .from("tenant_feature_entitlements")
    .select("feature_key,enabled")
    .eq("tenant_id", context.tenant.id)
    .eq("enabled", true);
  const enabled = new Set(
    (entitlementRows ?? []).map(
      (item: { feature_key: string }) => item.feature_key
    )
  );

  const [
    { data: announcements },
    { data: recipientRows },
    allEvents,
    allCourses,
    allResources,
    allEpisodes
  ] = await Promise.all([
    enabled.has("communication_announcements")
      ? context.supabase
          .from("communication_announcements")
          .select(
            "id,title,summary,body,publish_at,is_pinned,audience_type,audience_ids"
          )
          .eq("tenant_id", context.tenant.id)
          .eq("status", "published")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("is_pinned", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    enabled.has("communication_direct_messages")
      ? context.supabase
          .from("communication_message_recipients")
          .select("id,message_id,read_at")
          .eq("tenant_id", context.tenant.id)
          .eq("user_id", context.user.id)
          .is("archived_at", null)
          .limit(5)
      : Promise.resolve({ data: [] }),
    enabled.has("events") ? getPublishedEvents(slug) : Promise.resolve([]),
    enabled.has("courses") ? getPublishedCourses(slug) : Promise.resolve([]),
    enabled.has("resources")
      ? getPublishedResources(slug)
      : Promise.resolve([]),
    enabled.has("podcasts") ? getPublishedEpisodes(slug) : Promise.resolve([])
  ]);

  const messageIds = (recipientRows ?? []).map((item: any) => item.message_id);
  const { data: messages } = messageIds.length
    ? await context.supabase
        .from("communication_messages")
        .select("id,subject,body,sent_at,created_at")
        .eq("tenant_id", context.tenant.id)
        .in("id", messageIds)
    : { data: [] };
  const firstName = (
    context.profile?.full_name ||
    context.user.user_metadata?.full_name ||
    context.user.email ||
    "Member"
  ).split(" ")[0];
  const subscription: any = context.subscription;
  const plan = subscription?.tenant_membership_plans;

  const quickLinks = [
    ...(enabled.has("podcasts")
      ? [["Browse content", `/demo/${slug}/episodes`]]
      : []),
    ...(enabled.has("courses")
      ? [["View courses", `/demo/${slug}/courses`]]
      : []),
    ...(enabled.has("events")
      ? [["View events", `/demo/${slug}/events`]]
      : []),
    ...(enabled.has("communication_direct_messages")
      ? [["View messages", `/demo/${slug}/messages`]]
      : []),
    ...(enabled.has("ai_coach")
      ? [["Ask the AI Coach", `/demo/${slug}/ai-coach`]]
      : []),
    ...(enabled.has("communication_hub") ? [["Communication preferences", `/demo/${slug}/settings/communications`]] : [])
  ];

  return (
    <main className="py-12">
      <Container className="space-y-8">
        <section
          className="overflow-hidden rounded-2xl p-8 text-white"
          style={{
            backgroundColor: context.branding?.primary_color || "#102a56",
            backgroundImage: context.branding?.hero_image_url
              ? `linear-gradient(#0008,#0008),url("${context.branding.hero_image_url}")`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <p className="text-sm font-bold uppercase tracking-wide opacity-80">
            {context.branding?.member_dashboard_greeting || `Welcome, ${firstName}`}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold">
            {context.branding?.welcome_headline ||
              `Welcome to ${context.tenant.name}`}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 opacity-90">
            {context.branding?.welcome_message ||
              "Welcome to your community. Your organization is still setting up content and experiences."}
          </p>
        </section>

        <MemberRecommendations tenantSlug={slug} />

        <div className="grid gap-5 lg:grid-cols-3">
          {enabled.has("memberships") && (
            <Card>
              <UserRound className="h-6 w-6 text-accent-700" />
              <h2 className="mt-4 font-display text-xl font-bold">
                Membership
              </h2>
              {subscription ? (
                <div className="mt-3 text-sm text-brand-600">
                  <p className="font-bold text-brand-900">
                    {plan?.name || "Membership"}
                  </p>
                  <p className="mt-1 capitalize">{subscription.status}</p>
                  <p className="mt-1">
                    {subscription.renewal_at
                      ? `Renews ${new Date(
                          subscription.renewal_at
                        ).toLocaleDateString()}`
                      : `Joined ${new Date(
                          subscription.starts_at
                        ).toLocaleDateString()}`}
                  </p>
                  {Array.isArray(plan?.benefits) && (
                    <ul className="mt-3 list-disc pl-5">
                      {plan.benefits.map((benefit: string) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-brand-600">
                  No audience membership plan is assigned.
                </p>
              )}
            </Card>
          )}

          {enabled.has("communication_announcements") && (
            <Card
              className={enabled.has("memberships") ? "lg:col-span-2" : "lg:col-span-3"}
            >
              <h2 className="font-display text-xl font-bold">
                Latest announcements
              </h2>
              {announcements?.length ? (
                <div className="mt-3 divide-y divide-brand-100">
                  {announcements.map((item: any) => (
                    <article key={item.id} className="py-3">
                      <div className="flex gap-2">
                        {item.is_pinned && (
                          <span className="text-xs font-bold text-accent-700">
                            Pinned
                          </span>
                        )}
                        <h3 className="font-bold text-brand-900">
                          {item.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-brand-600">
                        {item.summary || item.body}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-brand-600">
                  No announcements have been published for you.
                </p>
              )}
            </Card>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {enabled.has("communication_direct_messages") && (
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Messages</h2>
                <Link
                  href={`/demo/${slug}/messages`}
                  className="text-sm font-bold text-accent-700"
                >
                  View all
                </Link>
              </div>
              {messages?.length ? (
                <div className="mt-3 space-y-3">
                  {messages.map((message: any) => (
                    <p
                      key={message.id}
                      className="rounded-lg bg-brand-50 p-3 text-sm font-semibold text-brand-800"
                    >
                      {message.subject}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-brand-600">
                  No organization messages.
                </p>
              )}
              <p className="mt-3 text-xs text-brand-500">
                {
                  (recipientRows ?? []).filter((row: any) => !row.read_at)
                    .length
                }{" "}
                unread
              </p>
            </Card>
          )}
          {enabled.has("events") && (
            <Card>
              <h2 className="font-display text-xl font-bold">
                Upcoming events
              </h2>
              {allEvents.length ? (
                <div className="mt-3 space-y-3">
                  {allEvents.slice(0, 4).map((event: any) => (
                    <div key={event.id}>
                      <p className="font-bold text-brand-900">{event.title}</p>
                      <p className="text-sm text-brand-500">
                        {new Date(event.starts_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No upcoming events"
                  description="No eligible published events are available."
                  icon={CalendarDays}
                />
              )}
            </Card>
          )}
          {enabled.has("courses") && (
            <Card>
              <h2 className="font-display text-xl font-bold">
                Continue learning
              </h2>
              {allCourses.length ? (
                <div className="mt-3 space-y-2">
                  {allCourses.slice(0, 4).map((course: any) => (
                    <p key={course.id} className="font-semibold text-brand-800">
                      {course.title}
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No courses available"
                  description="No eligible published courses are available."
                  icon={FileText}
                />
              )}
            </Card>
          )}
          {(enabled.has("podcasts") || enabled.has("resources")) && (
            <Card>
              <h2 className="font-display text-xl font-bold">Recent content</h2>
              {allEpisodes.length || allResources.length ? (
                <div className="mt-3 space-y-2">
                  {[...allEpisodes, ...allResources]
                    .slice(0, 5)
                    .map((item: any) => (
                      <p
                        key={item.id}
                        className="font-semibold text-brand-800"
                      >
                        {item.title}
                      </p>
                    ))}
                </div>
              ) : (
                <EmptyState
                  title="No recent content"
                  description="No eligible published content is available."
                  icon={FileText}
                />
              )}
            </Card>
          )}
        </div>

        <Card>
          <h2 className="font-display text-xl font-bold">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {quickLinks.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-bold text-brand-700 hover:border-accent-400"
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>

        {context.branding?.support_email && (
          <p className="text-center text-sm text-brand-500">
            <Mail className="mr-2 inline h-4 w-4" />
            Support: {context.branding.support_email}
          </p>
        )}
      </Container>
    </main>
  );
}
