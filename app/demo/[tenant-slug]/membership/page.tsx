import { redirect } from "next/navigation";

export default async function LegacyMembershipPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  redirect(`/demo/${slug}/account#membership`);
}
