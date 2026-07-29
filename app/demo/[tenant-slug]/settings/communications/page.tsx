import { redirect, notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { MemberPreferences } from "@/components/communications/MemberPreferences";
import { getTenantMemberContext } from "@/lib/communications/member-context";

export default async function CommunicationPreferencesPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const context = await getTenantMemberContext(slug);
  if (!context) redirect(`/login?next=${encodeURIComponent(`/demo/${slug}/settings/communications`)}`);
  const { data: entitlement } = await context.supabase.from("tenant_feature_entitlements").select("enabled").eq("tenant_id", context.tenant.id).eq("feature_key", "communication_hub").maybeSingle();
  if (entitlement?.enabled !== true) notFound();
  return <main className="py-12"><Container><MemberPreferences tenantSlug={slug} /></Container></main>;
}
