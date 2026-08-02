import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Container } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { currentAcceptanceVersions } from "@/lib/legal";
import { acceptCurrentLegal } from "./actions";

export default async function LegalAcceptancePage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/dashboard", error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/legal/accept")}`);
  const versions = await currentAcceptanceVersions();
  return <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12"><Container><Card className="mx-auto max-w-lg p-8"><BrandMark /><h1 className="mt-8 font-display text-3xl font-extrabold text-brand-900">Review updated legal terms</h1><p className="mt-3 text-sm leading-6 text-brand-600">To continue using UpNexx, review and accept Terms version {versions.terms} and Privacy version {versions.privacy}.</p>{error && <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}<form action={acceptCurrentLegal} className="mt-7 space-y-5"><input type="hidden" name="next" value={next} /><label className="flex items-start gap-3 rounded-xl border border-brand-200 p-4 text-sm leading-6 text-brand-700"><input name="acceptLegal" type="checkbox" required className="mt-1" /><span>I accept the <Link href="/terms" target="_blank" className="font-bold text-accent-700 underline">Terms of Service</Link> and acknowledge the <Link href="/privacy" target="_blank" className="font-bold text-accent-700 underline">Privacy Policy</Link>.</span></label><Button type="submit" className="w-full">Accept and Continue</Button></form></Card></Container></main>;
}
