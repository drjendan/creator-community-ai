"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { createPasswordRecoveryClient } from "@/lib/supabase/client";
import { AuthLegalLinks } from "@/components/legal/AuthLegalLinks";
import { logError } from "@/lib/logging";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createPasswordRecoveryClient();
    let active = true;

    async function prepareRecoverySession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active) {
          setSessionReady(Boolean(data.session));
          if (!data.session) setMessage("This password reset link is invalid or has expired. Request a new email.");
        }
      } catch (error) {
        logError("auth.password_recovery.session_failed", error);
        if (active) setMessage(error instanceof Error ? error.message : "This password reset link is invalid or has expired.");
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void prepareRecoverySession();
    return () => { active = false; };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createPasswordRecoveryClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
        return;
      }
      setSuccess(true);
      setMessage("Your password has been updated. You can now sign in.");
    } catch (error) {
      logError("auth.password_recovery.update_failed", error);
      setMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <Container>
        <Card className="mx-auto max-w-md p-8">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">Choose a new password</h1>
          <p className="mt-2 text-sm text-brand-600">Enter a new password for your UpNexx account.</p>

          {checkingSession ? (
            <p className="mt-7 text-sm font-semibold text-brand-600" role="status">Verifying your reset link...</p>
          ) : success ? (
            <div className="mt-7 space-y-4">
              <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{message}</div>
              <Button href="/login" className="w-full">Continue to sign in</Button>
            </div>
          ) : (
            <>
              {message && <div role="alert" className="mt-7 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{message}</div>}
              {sessionReady ? (
                <form className="mt-7 space-y-4" onSubmit={updatePassword}>
                  <Field label="New password" htmlFor="new-password">
                    <Input
                      id="new-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Confirm new password" htmlFor="confirm-password">
                    <Input
                      id="confirm-password"
                      name="password-confirmation"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      required
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Updating password..." : "Update password"}
                  </Button>
                </form>
              ) : (
                <Link href="/forgot-password" className="mt-5 block text-center text-sm font-semibold text-accent-700">
                  Request another reset email
                </Link>
              )}
            </>
          )}
          <AuthLegalLinks />
        </Card>
      </Container>
    </main>
  );
}
