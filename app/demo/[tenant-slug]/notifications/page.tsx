import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { MemberNotifications } from "@/components/tenant/MemberNotifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberExperienceAccess, hasMemberExperienceAuthorization, type MemberNotification } from "@/lib/member-experience";

export default async function NotificationsPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id,slug").eq("slug", slug).eq("status", "active").maybeSingle();
  const access = tenant ? await getMemberExperienceAccess(tenant.id, tenant.slug) : null;
  if (!tenant || !hasMemberExperienceAuthorization(access)) redirect(`/login?next=${encodeURIComponent(`/demo/${slug}/notifications`)}`);
  const { data } = await admin.from("notifications").select("id,title,body,status,created_at").eq("tenant_id", tenant.id).eq("user_id", access!.user.id).order("created_at", { ascending: false }).limit(100);
  return <main className="py-12"><Container><MemberNotifications tenantSlug={slug} initialNotifications={(data ?? []) as MemberNotification[]} /></Container></main>;
}
