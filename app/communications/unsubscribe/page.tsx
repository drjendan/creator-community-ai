import { Card, Button, Select, Field } from "@/components/ui";
import { BrandMark } from "@/components/BrandMark";
import { verifyPreferenceToken } from "@/lib/communications/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { unsubscribe } from "./actions";

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const params = await searchParams;
  const parsed = params.token ? verifyPreferenceToken(params.token) : null;
  const admin = createAdminClient();
  const { data: tenant } = parsed
    ? await admin
        .from("tenants")
        .select("name")
        .eq("id", parsed.tenantId)
        .maybeSingle()
    : { data: null };

  if (params.status === "success") {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-50 p-6">
        <Card className="max-w-lg text-center">
          <BrandMark />
          <h1 className="mt-6 font-display text-2xl font-bold text-brand-900">
            Preferences updated
          </h1>
          <p className="mt-3 text-brand-600">
            Your email preference was saved. Required account and security
            messages remain enabled.
          </p>
        </Card>
      </main>
    );
  }
  if (!parsed || !tenant) {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-50 p-6">
        <Card className="max-w-lg text-center">
          <h1 className="font-display text-2xl font-bold text-brand-900">
            This preference link is invalid or expired.
          </h1>
          <p className="mt-3 text-brand-600">
            Contact the organization that sent the email for assistance.
          </p>
        </Card>
      </main>
    );
  }
  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 p-6">
      <Card className="w-full max-w-lg">
        <BrandMark />
        <h1 className="mt-6 font-display text-2xl font-bold text-brand-900">
          Manage emails from {tenant.name}
        </h1>
        <p className="mt-2 text-sm text-brand-600">
          Choose which marketing email to stop. Security and required service
          messages cannot be disabled here.
        </p>
        <form action={unsubscribe} className="mt-6 space-y-5">
          <input type="hidden" name="token" value={params.token} />
          <Field label="Email category" htmlFor="category">
            <Select id="category" name="category">
              <option value="all_marketing">All marketing email</option>
              <option value="newsletters">Newsletters</option>
              <option value="announcements">Announcements</option>
              <option value="new_content">New content</option>
              <option value="event_reminders">Event reminders</option>
              <option value="course_notifications">
                Course notifications
              </option>
              <option value="membership_reminders">
                Membership reminders
              </option>
              <option value="community_summaries">
                Community summaries
              </option>
              <option value="direct_messages">
                Direct organization messages
              </option>
              <option value="weekly_digest">Weekly digest</option>
            </Select>
          </Field>
          <Button type="submit">Save unsubscribe preference</Button>
        </form>
      </Card>
    </main>
  );
}
