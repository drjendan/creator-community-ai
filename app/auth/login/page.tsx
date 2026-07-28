import { redirect } from "next/navigation";

export default async function LegacyLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(`/login?next=${encodeURIComponent(destination)}`);
}
