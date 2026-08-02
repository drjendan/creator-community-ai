import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { hasSupabaseEnv } from "@/lib/env";
import { signIn } from "./actions";
import Link from "next/link";
import { AuthLegalLinks } from "@/components/legal/AuthLegalLinks";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const live = hasSupabaseEnv();
  const { error, message, next = "/dashboard" } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <Container>
        <Card className="mx-auto max-w-md p-8">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">
            Sign in to UpNexx
          </h1>
          <p className="mt-2 text-sm text-brand-600">
            {live
              ? "Use your UpNexx administrator credentials."
              : "Sign-in is temporarily unavailable because the authentication service is not configured."}
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}
          {message && <div role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{message}</div>}

          {live ? (
            <form action={signIn} className="mt-7 space-y-4">
              <input type="hidden" name="next" value={next} />
              <Field label="Email" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Password" htmlFor="password">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          ) : (
            <div role="alert" className="mt-7 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800">
              Contact the platform administrator for assistance.
            </div>
          )}

          <a href="/forgot-password" className="mt-5 block text-center text-sm font-semibold text-accent-700">
            Forgot your password?
          </a>
          <p className="mt-3 text-center text-sm text-brand-600">Need an account? <Link href="/signup" className="font-bold text-accent-700">Create one</Link></p>
          <AuthLegalLinks />
        </Card>
      </Container>
    </main>
  );
}

