import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { hasSupabaseEnv } from "@/lib/env";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const live = hasSupabaseEnv();
  const { error, next = "/dashboard" } = await searchParams;

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
              : "Supabase is not configured. This is a clearly labeled mock sign-in experience."}
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

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
            <Button href="/dashboard" className="mt-7 w-full">
              Enter Demo Dashboard
            </Button>
          )}

          <a href="/forgot-password" className="mt-5 block text-center text-sm font-semibold text-accent-700">
            Forgot your password?
          </a>
        </Card>
      </Container>
    </main>
  );
}

