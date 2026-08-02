"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { AuthLegalLinks } from "@/components/legal/AuthLegalLinks";
import { Button, Card, Container } from "@/components/ui";
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
    const { data: { session } } = await supabase.auth.getSession();
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
    } else setMessage(result.error ?? "Unable to accept this invitation.");
  }, [token]);

  useEffect(() => { void accept(); }, [accept]);

  const returnPath = `/invite/accept?token=${token || ""}`;
  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <Container>
        <Card className="mx-auto max-w-lg p-8">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">Team invitation</h1>
          <p role="status" className="mt-4 text-sm text-brand-600">{message}</p>
          <div className="mt-6">
            {accepted ? <Button href="/dashboard">Open tenant dashboard</Button> : signedIn ? <Button type="button" onClick={() => void accept()}>Accept invitation</Button> : <div className="flex flex-wrap gap-3"><Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-bold text-accent-700">Sign in to accept</Link><Button href={`/signup?next=${encodeURIComponent(returnPath)}`} variant="secondary">Create account and accept</Button></div>}
          </div>
          <AuthLegalLinks />
        </Card>
      </Container>
    </main>
  );
}
