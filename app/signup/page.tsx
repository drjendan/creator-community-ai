import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { AuthLegalLinks } from "@/components/legal/AuthLegalLinks";
import { Button, Card, Container, Field, Input } from "@/components/ui";
import { hasSupabaseEnv } from "@/lib/env";
import { signUp } from "./actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next = "/dashboard" } = await searchParams;
  const live = hasSupabaseEnv();
  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <Container>
        <Card className="mx-auto max-w-md p-8">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">Create your UpNexx account</h1>
          <p className="mt-2 text-sm text-brand-600">Create a secure account for your organization or invitation.</p>
          {error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
          {live ? (
            <form action={signUp} className="mt-7 space-y-4">
              <input type="hidden" name="next" value={next} />
              <Field label="Email" htmlFor="signup-email"><Input id="signup-email" name="email" type="email" autoComplete="email" required /></Field>
              <Field label="Password" htmlFor="signup-password" hint="At least 8 characters"><Input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
              <label className="flex items-start gap-3 rounded-xl border border-brand-200 p-4 text-sm leading-6 text-brand-700"><input name="acceptLegal" type="checkbox" required className="mt-1" /><span>I accept the <Link href="/terms" target="_blank" className="font-bold text-accent-700 underline">Terms of Service</Link> and acknowledge the <Link href="/privacy" target="_blank" className="font-bold text-accent-700 underline">Privacy Policy</Link>.</span></label>
              <Button type="submit" className="w-full">Create Account</Button>
            </form>
          ) : <div role="alert" className="mt-7 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-brand-800">Account creation is unavailable until authentication is configured.</div>}
          <p className="mt-5 text-center text-sm text-brand-600">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-accent-700">Sign in</Link></p>
          <AuthLegalLinks />
        </Card>
      </Container>
    </main>
  );
}
