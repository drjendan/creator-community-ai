"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const successMessage = "Password reset email sent. Please check your inbox and spam folder.";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendRecoveryEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.info("[Password recovery] Button clicked");

    const submittedEmail = email.trim();
    setEmail(submittedEmail);
    console.info("[Password recovery] Email submitted");

    if (!submittedEmail) {
      setStatus("error");
      setMessage("Email is required.");
      return;
    }
    if (!validEmail(submittedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("sending");
    setMessage("");
    console.info("[Password recovery] Supabase recovery request started");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(submittedEmail, {
        redirectTo: `${window.location.origin}/update-password`
      });

      if (error) {
        console.error("[Password recovery] Error response", error.message);
        setStatus("error");
        setMessage(error.message);
        return;
      }

      console.info("[Password recovery] Success response");
      setStatus("success");
      setMessage(successMessage);
    } catch (error) {
      console.error("[Password recovery] Unexpected error", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send the password reset email.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <Container>
        <Card className="mx-auto max-w-md p-8">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">Reset your password</h1>
          <p className="mt-2 text-sm text-brand-600">Enter your account email to receive secure reset instructions.</p>

          <form className="mt-7 space-y-4" onSubmit={sendRecoveryEmail} noValidate>
            <Field label="Email" htmlFor="recovery-email">
              <Input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                aria-invalid={status === "error"}
              />
            </Field>

            {message && (
              <div
                role={status === "error" ? "alert" : "status"}
                className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                  status === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-green-200 bg-green-50 text-green-800"
                }`}
              >
                {message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={status === "sending"}>
              {status === "sending"
                ? "Sending reset email..."
                : status === "success"
                  ? "Resend Email"
                  : "Send Reset Email"}
            </Button>
          </form>

          <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-accent-700">
            Return to sign in
          </Link>
        </Card>
      </Container>
    </main>
  );
}
