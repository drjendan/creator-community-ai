"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function InvitationAcceptance() {
  const search = useSearchParams();
  const token = search.get("token");
  const [message, setMessage] = useState("Validating your invitation…");
  const [accepted, setAccepted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const accept = useCallback(async () => {
      if (!token) {
        setMessage("The invitation link is invalid.");
        return;
      }
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        setSignedIn(false);
        setMessage("Sign in or create an account with the invited email address.");
        return;
      }
      setSignedIn(true);
      const response = await fetch("/api/team/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const result = await response.json();
      if (response.ok) {
        setAccepted(true);
        setMessage("Invitation accepted. Your tenant access is ready.");
      } else {
        setMessage(result.error ?? "Unable to accept this invitation.");
      }
  }, [token]);

  useEffect(() => {
    void accept();
  }, [accept]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setMessage("Creating your account…");
    const supabase = createClient();
    const { data: signUp, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    if (!signUp.session) {
      setMessage(
        "Check your email to confirm the account, then reopen this invitation link."
      );
      return;
    }
    setSignedIn(true);
    await accept();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <Container>
        <Card className="mx-auto max-w-lg p-8">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">
            Team invitation
          </h1>
          <p role="status" className="mt-4 text-sm text-brand-600">
            {message}
          </p>
          <div className="mt-6">
            {accepted ? (
              <Button href="/dashboard">Open tenant dashboard</Button>
            ) : signedIn ? (
              <Button type="button" onClick={() => void accept()}>
                Accept invitation
              </Button>
            ) : (
              <div className="space-y-6">
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/accept?token=${token || ""}`)}`}
                className="text-sm font-bold text-accent-700"
              >
                Already have an account? Sign in to accept
              </Link>
                <form onSubmit={createAccount} className="space-y-4 border-t border-brand-100 pt-5">
                  <h2 className="font-display text-lg font-bold text-brand-900">
                    Create an account
                  </h2>
                  <Field label="Invited email address" htmlFor="invite-email">
                    <Input id="invite-email" name="email" type="email" required />
                  </Field>
                  <Field label="Password" htmlFor="invite-password">
                    <Input
                      id="invite-password"
                      name="password"
                      type="password"
                      minLength={8}
                      required
                    />
                  </Field>
                  <Button type="submit">Create account and accept</Button>
                </form>
              </div>
            )}
          </div>
        </Card>
      </Container>
    </main>
  );
}
