import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { MemberDataRights } from "@/components/tenant/MemberDataRights";
import { getTenantMemberContext } from "@/lib/communications/member-context";

export default async function MemberDataPage({ params }: { params: Promise<{ "tenant-slug": string }> }) { const { "tenant-slug": slug } = await params; if (!(await getTenantMemberContext(slug))) redirect(`/login?next=${encodeURIComponent(`/demo/${slug}/settings/data`)}`); return <main className="py-12"><Container><MemberDataRights tenantSlug={slug} /></Container></main>; }
