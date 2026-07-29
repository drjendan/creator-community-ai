import { notFound, redirect } from "next/navigation";
import { getTenantSiteBySlug } from "@/lib/tenant-site";

export default async function MemberDashboardPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const tenant = await getTenantSiteBySlug(slug);
  if (!tenant) notFound();
  redirect(tenant.communicationEnabled ? `/demo/${slug}/welcome` : `/demo/${slug}`);
}
