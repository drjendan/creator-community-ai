"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export function PlatformInvitationAcceptance({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/platform/invitations/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(result.error || "Unable to accept this platform invitation.");
      return;
    }
    router.push("/platform-admin/team");
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-xl">
      <p className="text-xs font-bold uppercase tracking-wide text-accent-700">Platform Team</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-brand-900">Accept your UpNexx invitation</h1>
      <p className="mt-3 text-sm leading-6 text-brand-600">Accepting grants access only to the UpNexx platform responsibilities assigned by the inviter. It does not create a tenant membership.</p>
      <Button type="button" className="mt-6" disabled={busy} onClick={() => void accept()}>{busy ? "Accepting…" : "Accept Platform Invitation"}</Button>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    </Card>
  );
}
