import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";
export default async function PlatformSectionPage({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; const title = section.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "); return <ModulePlaceholder title={title} description={`Manage UpNexx ${title.toLowerCase()} across all tenants.`} />; }

