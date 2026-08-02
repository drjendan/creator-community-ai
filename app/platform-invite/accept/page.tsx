import { redirect } from "next/navigation";
import { PlatformInvitationAcceptance } from "@/components/platform/PlatformInvitationAcceptance";
import { AuthLegalLinks } from "@/components/legal/AuthLegalLinks";
import { Button, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformInviteAcceptPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token || "";
  if (!token) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const next = `/platform-invite/accept?token=${encodeURIComponent(token)}`;
  return (
    <main className="min-h-screen bg-brand-50 py-16">
      <Container>
        {user ? (
          <PlatformInvitationAcceptance token={token} />
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-brand-200 bg-white p-7 shadow-card">
            <h1 className="font-display text-3xl font-extrabold text-brand-900">Sign in to accept</h1>
            <p className="mt-3 text-sm text-brand-600">Use the email address that received the platform invitation.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href={`/login?next=${encodeURIComponent(next)}`}>Sign In</Button>
              <Button href={`/signup?next=${encodeURIComponent(next)}`} variant="secondary">Create Account</Button>
            </div>
            <AuthLegalLinks />
          </div>
        )}
      </Container>
    </main>
  );
}
