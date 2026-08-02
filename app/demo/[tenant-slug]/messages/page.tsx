/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { MemberMessages } from "@/components/communications/MemberMessages";
import { getTenantMemberContext } from "@/lib/communications/member-context";

export default async function MessagesPage({ params }: { params: Promise<{ "tenant-slug": string }> }) {
  const { "tenant-slug": slug } = await params;
  const context = await getTenantMemberContext(slug);
  if (!context) redirect(`/login?next=${encodeURIComponent(`/demo/${slug}/messages`)}`);
  const { data: entitlement } = await context.supabase.from("tenant_feature_entitlements").select("enabled").eq("tenant_id", context.tenant.id).eq("feature_key", "communication_direct_messages").maybeSingle();
  const { data: recipients } = entitlement?.enabled === true
    ? await context.supabase.from("communication_message_recipients").select("id,message_id,read_at").eq("tenant_id", context.tenant.id).eq("user_id", context.user.id).is("archived_at", null)
    : { data: [] };
  const ids = (recipients ?? []).map((item: any) => item.message_id);
  const { data: messages } = ids.length ? await context.supabase.from("communication_messages").select("id,subject,body,sent_at,created_at").eq("tenant_id", context.tenant.id).in("id", ids).order("created_at", { ascending: false }) : { data: [] };
  const recipientMap = new Map((recipients ?? []).map((item: any) => [item.message_id, item]));
  const rows = (messages ?? []).map((message: any) => ({ ...message, recipient_id: recipientMap.get(message.id)?.id, read_at: recipientMap.get(message.id)?.read_at }));
  return <main className="py-12"><Container><MemberMessages tenantSlug={slug} initialMessages={rows} /></Container></main>;
}
